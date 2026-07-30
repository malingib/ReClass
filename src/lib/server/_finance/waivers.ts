import { fail } from '@sveltejs/kit';
import { logError } from '../_platform/log';
import { flattenStudentName, withTenant, rpc } from '../_platform/query';
import { WAIVERS_LIST_LIMIT, WAIVERS_SEARCH_LIMIT } from '$lib/config';

type StudentRef = { first_name?: string | null; last_name?: string | null; admission_no?: string | null };
type InvoiceJoin = { status?: string | null; students?: StudentRef | StudentRef[] | null } | null;
type WaiverRow = { id: string; amount: number; reason: string; created_at?: string | null; invoices?: InvoiceJoin };
type InvoiceListRow = { id: string; amount_due: number; amount_paid?: number | null; status: string; students?: StudentRef | StudentRef[] | null };

export async function getWaiversAndInvoices(sb: App.Locals['srv'], tenantId: string) {
  const [waiversRes, invoicesRes] = await Promise.all([
    withTenant(
      sb
        .from('waivers')
        .select(`
          id, amount, reason, created_at,
          invoices!inner(amount_due, amount_paid, status, students!inner(first_name, last_name, admission_no))
        `)
        .order('created_at', { ascending: false })
        .limit(WAIVERS_LIST_LIMIT),
      tenantId,
    ),
    withTenant(
      sb
        .from('invoices')
        .select('id, amount_due, amount_paid, status, students(first_name, last_name, admission_no)')
        .not('status', 'eq', 'paid')
        .not('status', 'eq', 'waived')
        .order('created_at', { ascending: false })
        .limit(WAIVERS_SEARCH_LIMIT),
      tenantId,
    ),
  ]);

  const waivers = ((waiversRes.data ?? []) as WaiverRow[]).map((w) => {
    const { student_name, admission_no } = flattenStudentName(w.invoices ?? {});
    return {
      ...w,
      student_name,
      admission_no,
      invoice_status: w.invoices?.status ?? '—',
    };
  });

  const invoices = ((invoicesRes.data ?? []) as InvoiceListRow[]).map((inv) => ({
    ...inv,
    ...flattenStudentName(inv),
  }));

  return { waivers, invoices };
}

export async function createWaiver(
  sb: App.Locals['srv'],
  tenantId: string,
  userId: string,
  formData: { invoice_id: string; amount: number; reason: string },
) {
  const { invoice_id: invoiceId, amount, reason } = formData;

  if (!invoiceId || !reason || !amount || amount <= 0) {
    return fail(400, { error: 'Invoice, amount, and reason are required. Amount must be greater than 0.' });
  }

  const { data: result, error: rpcError } = await rpc<Record<string, unknown>>(sb, 'grant_waiver', {
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_reason: reason,
    p_granted_by: userId,
    p_tenant_id: tenantId,
  });

  if (rpcError) {
    logError('waiver_create', rpcError, { invoiceId, amount, reason });
    return fail(500, { error: 'Failed to create waiver. Please try again.' });
  }

  const status = (result ?? {}) as Record<string, unknown>;
  if (status.status === 'not_found') return fail(404, { error: 'Invoice not found.' });
  if (status.status === 'already_settled') return fail(400, { error: String(status.message) });
  if (status.status === 'exceeds_balance') return fail(400, { error: String(status.message) });
  if (status.status === 'invalid_amount') return fail(400, { error: String(status.message) });

  return { success: true as const, amount, reason };
}
