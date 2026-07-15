import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: allInvoices } = await locals.supabase
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, students(first_name, last_name, grade)')
    .order('due_date', { ascending: false });

  const { count: totalStudents } = await locals.supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  const { count: paidCount } = await locals.supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paid');

  const { count: unpaidCount } = await locals.supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unpaid');

  const { count: partialCount } = await locals.supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'partially_paid');

  return {
    allInvoices: allInvoices ?? [],
    stats: { totalStudents: totalStudents ?? 0, paid: paidCount ?? 0, unpaid: unpaidCount ?? 0, partial: partialCount ?? 0 },
  };
};
