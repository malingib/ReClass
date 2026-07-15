import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: invoices } = await locals.supabase
    .from('invoices')
    .select('id, amount_due, amount_paid, status, due_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return { invoices: invoices ?? [] };
};
