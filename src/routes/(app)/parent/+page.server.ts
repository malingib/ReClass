import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: students } = await locals.supabase
    .from('students')
    .select('id, first_name, last_name, grade, status')
    .limit(5);

  const { data: invoices } = await locals.supabase
    .from('invoices')
    .select('id, amount_due, amount_paid, status, due_date')
    .order('created_at', { ascending: false })
    .limit(5);

  return { students: students ?? [], invoices: invoices ?? [] };
};
