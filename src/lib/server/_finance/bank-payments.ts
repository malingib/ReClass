import { fail } from '@sveltejs/kit';
import { z } from 'zod/v3';
import { parseForm } from '$lib/server/_platform/validation';

const bankPaymentSchema = z.object({
  invoice_id: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  bank_reference: z.string().min(1, 'Bank reference is required').max(200),
  bank_name: z.string().max(100).optional(),
  received_at: z.string().max(50).optional(),
});

export type BankPaymentInput = z.infer<typeof bankPaymentSchema>;

/**
 * Record a school-fee payment made via KCB / Buni bank transfer.
 * School fees are tracked separately from remedial (M-Pesa) fees — this is the
 * bank channel for the Finance module.
 */
export async function recordBankPayment(
  sb: App.Locals['srv'],
  tenantId: string,
  userId: string | undefined,
  raw: FormData,
) {
  const v = parseForm(bankPaymentSchema, raw);
  if (!v.success) return fail(400, { errors: v.errors });

  // Validate the invoice belongs to this tenant and is a school-fee invoice.
  const { data: invoice, error: invErr } = await sb
    .from('invoices')
    .select('id, tenant_id, amount_due, amount_paid, status, domain')
    .eq('id', v.data.invoice_id)
    .eq('tenant_id', tenantId)
    .single();
  if (invErr || !invoice) return fail(404, { message: 'Invoice not found.' });
  if (invoice.domain && invoice.domain !== 'school') {
    return fail(400, { message: 'This invoice is not a school fee. Use M-Pesa for remedial fees.' });
  }

  const amount = Number(v.data.amount);
  const { error: payErr } = await sb.from('payments').insert({
    tenant_id: tenantId,
    invoice_id: v.data.invoice_id,
    amount,
    method: 'bank',
    bank_reference: v.data.bank_reference,
    bank_name: v.data.bank_name || 'KCB',
    phone: null,
    status: 'paid',
    deposited_by: userId ?? null,
    reconciled_at: new Date().toISOString(),
  });
  if (payErr) return fail(500, { message: `Failed to record payment: ${payErr.message}` });

  // Update invoice paid total + status (mirrors reconcile_payment behaviour).
  const newPaid = Number(invoice.amount_paid ?? 0) + amount;
  const newStatus = newPaid >= Number(invoice.amount_due) ? 'paid' : 'partial';
  const { error: invUpdErr } = await sb
    .from('invoices')
    .update({ amount_paid: newPaid, status: newStatus })
    .eq('id', v.data.invoice_id)
    .eq('tenant_id', tenantId);
  if (invUpdErr) return fail(500, { message: `Payment recorded but invoice update failed: ${invUpdErr.message}` });

  return { success: true as const, message: 'Bank payment recorded successfully' };
}
