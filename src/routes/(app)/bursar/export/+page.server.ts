import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'bursar');
  const db = locals.srv;

  const { data: invoices } = await db
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, status, due_date, created_at,
      students!inner(first_name, last_name, admission_no, grade)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5000);

  const invoiceData = (invoices ?? []).map((i) => ({
    ...i,
    student_name: `${i.students?.first_name ?? ''} ${i.students?.last_name ?? ''}`.trim() || '—',
    admission_no: i.students?.admission_no ?? '—',
    grade: i.students?.grade ?? '—',
  }));

  const statusCounts: Record<string, number> = {};
  for (const inv of invoiceData) {
    const key = inv.status ?? 'unknown';
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  const totalDue = invoiceData.reduce((s, i) => s + Number(i.amount_due), 0);
  const totalPaid = invoiceData.reduce((s, i) => s + Number(i.amount_paid), 0);

  return {
    invoices: invoiceData,
    statusCounts,
    totalDue,
    totalPaid,
    outstanding: totalDue - totalPaid,
  };
};
