import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: allInvoices } = await sb
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, students(first_name, last_name, grade)')
    .eq('tenant_id', tid)
    .order('due_date', { ascending: false });

  const { count: totalStudents } = await sb
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tid);

  const { count: paidCount } = await sb
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tid)
    .eq('status', 'paid');

  const { count: unpaidCount } = await sb
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tid)
    .eq('status', 'unpaid');

  const { count: partialCount } = await sb
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tid)
    .eq('status', 'partially_paid');

  return {
    allInvoices: allInvoices ?? [],
    stats: { totalStudents: totalStudents ?? 0, paid: paidCount ?? 0, unpaid: unpaidCount ?? 0, partial: partialCount ?? 0 },
  };
};
