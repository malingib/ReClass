import { describe, it, expect } from 'vitest';
import { recordBankPayment } from '$lib/server/_finance/bank-payments';
import { fail } from '@sveltejs/kit';

/**
 * Minimal fake of the Supabase client surface used by recordBankPayment.
 * Records the inserted payment row so we can assert the receipt is fully
 * populated (student_id / fee_type_id / domain / receipt_no), and lets the
 * fee_type lookup return a school-fee row (or a remedial one to test rejection).
 */
function makeSb(opts: { feeDomain?: string; feeFound?: boolean; insertError?: { code?: string; message: string } } = {}) {
  let inserted: Record<string, unknown> | null = null;
  let receiptSmsQueued = false;
  const sb: any = {
    rpc(name: string) {
      if (name === 'tenant_setting_enabled') return { data: true, error: null };
      return { data: null, error: null };
    },
    from(table: string) {
      if (table === 'fee_types') {
        const chain: any = {
          eq: () => chain,
          is: () => ({
            single: async () =>
              opts.feeFound === false
                ? { data: null, error: { message: 'not found' } }
                : { data: { id: 'ft1', tenant_id: 't1', name: 'Term Fee', domain: opts.feeDomain ?? 'school' }, error: null },
          }),
        };
        return { select: () => chain };
      }
      if (table === 'payments') {
        return {
          insert: (row: Record<string, unknown>) => {
            inserted = row;
            return {
              select: () => ({
                single: async () =>
                  opts.insertError
                    ? { data: null, error: opts.insertError }
                    : { data: { id: 'p1' }, error: null },
              }),
            };
          },
        };
      }
      if (table === 'students') {
        const chain: any = {
          eq: () => chain,
          is: () => chain,
          maybeSingle: async () => ({ data: { id: 's1' }, error: null }),
        };
        return { select: () => chain };
      }
      if (table === 'guardians_link') {
        const chain: any = {
          eq: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({ data: { parents: { phone: '+254711223344', sms_consent: true } }, error: null }),
        };
        return { select: () => chain };
      }
      if (table === 'notifications') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
          insert: (row: Record<string, unknown>) => {
            const extId = row.external_id as string | undefined;
            if (row.channel === 'sms' && extId?.startsWith('payment-receipt:')) receiptSmsQueued = true;
            return { error: null };
          },
        };
      }
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: null, error: null }) }) }) }), insert: () => ({ error: null }) };
    },
    __inserted: () => inserted,
    __receiptSmsQueued: () => receiptSmsQueued,
  };
  return sb;
}

function form(data: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const base = {
  student_id: 's1',
  fee_type_id: 'ft1',
  amount: '2500',
  bank_reference: 'KCB123',
};

describe('recordBankPayment (payments are receipts)', () => {
  it('records a fully-populated school-fee receipt', async () => {
    const sb = makeSb({ feeDomain: 'school' });
    const res = await recordBankPayment(sb, 't1', 'u1', form(base));

    expect(res).toEqual({ success: true, message: 'Bank payment recorded successfully' });
    const row = sb.__inserted();
    expect(row).not.toBeNull();
    expect(row.student_id).toBe('s1');
    expect(row.fee_type_id).toBe('ft1');
    expect(row.domain).toBe('school');
    expect(row.method).toBe('bank');
    expect(row.status).toBe('paid');
    expect(row.reconciled_at).toBeTruthy();
    expect(typeof row.receipt_no).toBe('string');
    expect(row.receipt_no).toMatch(/^RCP-/);
    expect(row.cashier_id).toBe('u1');
    expect(row.amount).toBe(2500);
  });

  it('rejects a non-school fee type (remedial must use M-Pesa)', async () => {
    const sb = makeSb({ feeDomain: 'remedial' });
    const res = await recordBankPayment(sb, 't1', 'u1', form(base));
    expect(res).toBeInstanceOf(fail(400).constructor);
    expect((res as any).status).toBe(400);
    expect(sb.__inserted()).toBeNull();
  });

  it('fails when the fee type is not found', async () => {
    const sb = makeSb({ feeFound: false });
    const res = await recordBankPayment(sb, 't1', 'u1', form(base));
    expect(res).toBeInstanceOf(fail(404).constructor);
    expect((res as any).status).toBe(404);
    expect(sb.__inserted()).toBeNull();
  });

  it('validates the input shape (amount > 0, required fields)', async () => {
    const sb = makeSb({ feeDomain: 'school' });
    const res = await recordBankPayment(sb, 't1', 'u1', form({ ...base, amount: '-5' }));
    expect(res).toBeInstanceOf(fail(400).constructor);
    expect((res as any).status).toBe(400);
    expect(sb.__inserted()).toBeNull();
  });

  it('maps a duplicate bank reference (23505) to a 409 conflict', async () => {
    const sb = makeSb({ feeDomain: 'school', insertError: { code: '23505', message: 'duplicate key value' } });
    const res = await recordBankPayment(sb, 't1', 'u1', form(base));
    expect((res as any).status).toBe(409);
    expect((res as any).message ?? (res as any).data?.message).toMatch(/already been recorded/i);
  });
});
