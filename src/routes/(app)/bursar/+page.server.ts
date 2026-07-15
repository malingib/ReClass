import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { count: invoices } = await locals.supabase.from('invoices').select('*', { count: 'exact', head: true });
  const { count: paid } = await locals.supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid');
  const { count: unpaid } = await locals.supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid');
  const { data: recent } = await locals.supabase.from('invoices').select('id, amount_due, amount_paid, status, due_date').order('created_at', { ascending: false }).limit(5);

  return { stats: { invoices: invoices ?? 0, paid: paid ?? 0, unpaid: unpaid ?? 0 }, recent: recent ?? [] };
};
