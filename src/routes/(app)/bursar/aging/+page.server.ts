import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: aging } = await locals.supabase
    .from('invoices')
    .select('id, amount_due, amount_paid, due_date, status')
    .eq('status', 'unpaid')
    .order('due_date', { ascending: true });

  return { aging: aging ?? [] };
};
