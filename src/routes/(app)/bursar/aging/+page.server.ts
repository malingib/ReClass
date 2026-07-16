import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: aging } = await locals.srv
    .from('invoices')
    .select('id, amount_due, amount_paid, due_date, status')
    .eq('tenant_id', locals.tenantId)
    .eq('status', 'unpaid')
    .order('due_date', { ascending: true });

  return { aging: aging ?? [] };
};
