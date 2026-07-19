import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();
  const { data: revenue } = await locals.srv
    .from('payments')
    .select('amount, created_at')
    .eq('tenant_id', locals.tenantId)
    .gte('created_at', yearStart)
    .eq('status', 'paid')
    .limit(5000);

  const total = revenue?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  return { total, revenue: revenue ?? [] };
};
