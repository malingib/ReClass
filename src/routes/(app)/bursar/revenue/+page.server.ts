import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();
  const { data: revenue } = await locals.supabase
    .from('invoices')
    .select('amount_paid, paid_at')
    .gte('paid_at', yearStart)
    .eq('status', 'paid')
    .limit(5000);

  const total = revenue?.reduce((sum, r) => sum + Number(r.amount_paid), 0) ?? 0;
  return { total, revenue: revenue ?? [] };
};
