import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const { data: invoices } = await locals.srv
    .from('teacher_invoices')
    .select('status, amount_due, amount_paid')
    .eq('tenant_id', tenantId);

  const rows = invoices ?? [];
  const totalInvoices = rows.length;
  const paidInvoices = rows.filter(i => i.status === 'paid').length;
  const unpaidInvoices = rows.filter(i => i.status === 'unpaid').length;
  const draftInvoices = rows.filter(i => i.status === 'draft').length;
  const totalAmountDue = rows.reduce((s, i) => s + Number(i.amount_due ?? 0), 0);
  const totalPaid = rows.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);

  return {
    stats: { totalInvoices, paidInvoices, unpaidInvoices, draftInvoices, totalAmountDue, totalPaid },
  };
};
