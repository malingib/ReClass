import { fail } from '@sveltejs/kit';
import { z } from 'zod/v3';
import { parseForm } from '$lib/server/_platform/validation';
import { logError, sanitizeError } from '$lib/server/_platform/log';
import { enqueuePaymentReceiptSms, getStudentPayerPhone } from './notify';

/**
 * Record a school-fee payment made via KCB / Buni bank transfer.
 * School fees are tracked separately from remedial (M-Pesa) fees — this is the
 * bank channel for the Finance module. The payment IS the receipt: we no longer
 * create or update invoices; the payment row carries student + fee_type + domain.
 */
const bankPaymentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  fee_type_id: z.string().min(1, 'Fee type is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  bank_reference: z.string().min(1, 'Bank reference is required').max(200),
  bank_name: z.string().max(100).optional(),
  received_at: z.string().max(50).optional(),
});

export type BankPaymentInput = z.infer<typeof bankPaymentSchema>;

function makeReceiptNo(tenantId: string): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RCP-${tenantId.slice(0, 6).toUpperCase()}-${stamp}-${rand}`;
}

export async function recordBankPayment(
  sb: App.Locals['srv'],
  tenantId: string,
  userId: string | undefined,
  raw: FormData,
) {
  const v = parseForm(bankPaymentSchema, raw);
  if (!v.success) return fail(400, { errors: v.errors });

  // Validate the fee type belongs to this tenant and is a school-fee definition.
  const { data: feeType, error: ftErr } = await sb
    .from('fee_types')
    .select('id, tenant_id, name, domain')
    .eq('id', v.data.fee_type_id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();
  if (ftErr || !feeType) return fail(404, { message: 'Fee type not found.' });
  if (feeType.domain && feeType.domain !== 'school') {
    return fail(400, { message: 'This fee type is not a school fee. Use M-Pesa for remedial fees.' });
  }

  const { data: student, error: studentError } = await sb
    .from('students')
    .select('id')
    .eq('id', v.data.student_id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (studentError || !student) return fail(404, { message: 'Student not found in this school.' });

  const amount = Number(v.data.amount);
  const { data: payment, error: payErr } = await sb.from('payments').insert({
    tenant_id: tenantId,
    student_id: v.data.student_id,
    fee_type_id: v.data.fee_type_id,
    domain: 'school',
    amount,
    method: 'bank',
    bank_reference: v.data.bank_reference,
    bank_name: v.data.bank_name || 'KCB',
    phone: null,
    status: 'paid',
    receipt_no: makeReceiptNo(tenantId),
    cashier_id: userId ?? null,
    deposited_by: userId ?? null,
    reconciled_at: new Date().toISOString(),
  }).select('id').single();
  if (payErr) {
    // (tenant_id, bank_reference) is unique — a retry of the same bank slip is a no-op.
    if (payErr.code === '23505') {
      return fail(409, { message: 'This bank reference has already been recorded for your school.' });
    }
    logError('bank_payment_insert', payErr, { tenantId });
    return fail(500, { message: sanitizeError(payErr, 'Failed to record payment. Please try again.') });
  }

  // School-fee receipt SMS: unlike M-Pesa there is no callback carrying the
  // payer's number, so notify the linked parent (primary guardian).
  const payerPhone = await getStudentPayerPhone(sb, tenantId, v.data.student_id);
  if (payerPhone) {
    await enqueuePaymentReceiptSms(sb, tenantId, payment.id, payerPhone, amount);
  }

  return { success: true as const, message: 'Bank payment recorded successfully' };
}
