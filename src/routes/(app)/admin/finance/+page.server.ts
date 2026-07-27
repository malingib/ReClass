import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();

  const [invoiceResult, paymentsResult] = await Promise.all([
    locals.srv.from('invoices').select('amount_due, amount_paid, status').eq('tenant_id', tenantId),
    locals.srv.from('payments').select('amount').eq('tenant_id', tenantId).eq('status', 'paid').gte('created_at', yearStart),
  ]);

  const invoices = invoiceResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount_due ?? 0), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const pendingInvoices = invoices.filter(i => i.status === 'unpaid').length;
  const partialInvoices = invoices.filter(i => i.status === 'partial').length;
  const totalTransactions = payments.length;

  return {
    stats: { totalInvoiced, totalCollected, paidInvoices, pendingInvoices, partialInvoices, totalTransactions },
  };
};
