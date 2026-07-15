import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: invoices } = await locals.supabase
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, created_at, students(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(500);

  return { invoices: invoices ?? [] };
};
