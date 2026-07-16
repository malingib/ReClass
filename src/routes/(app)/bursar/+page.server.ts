import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { count: invoices } = await locals.srv.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId);
  const { count: paid } = await locals.srv.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid').eq('tenant_id', locals.tenantId);
  const { count: unpaid } = await locals.srv.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid').eq('tenant_id', locals.tenantId);
  const { data: recent } = await locals.srv.from('invoices').select('id, amount_due, amount_paid, status, due_date').eq('tenant_id', locals.tenantId).order('created_at', { ascending: false }).limit(5);

  return { stats: { invoices: invoices ?? 0, paid: paid ?? 0, unpaid: unpaid ?? 0 }, recent: recent ?? [] };
};
