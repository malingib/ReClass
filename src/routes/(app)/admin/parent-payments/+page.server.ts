import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { EXPORT_BURSA_MAX_ROWS } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');

  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();

  const [
    { data: invoices },
    { data: payments },
    { count: totalStudents },
    { count: paidCount },
    { count: unpaidCount },
    { count: partialCount },
  ] = await Promise.all([
    locals.srv
      .from('invoices')
      .select('id, student_id, amount_due, amount_paid, status, due_date, created_at, students(first_name, last_name, admission_no, grade)')
      .eq('tenant_id', locals.tenantId)
      .order('created_at', { ascending: false })
      .limit(EXPORT_BURSA_MAX_ROWS),
    locals.srv
      .from('payments')
      .select('id, invoice_id, amount, mpesa_receipt, phone, status, created_at')
      .eq('tenant_id', locals.tenantId)
      .gte('created_at', yearStart)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(200),
    locals.srv.from('students').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).then(r => ({ count: r.count })),
    locals.srv.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).eq('status', 'paid').then(r => ({ count: r.count })),
    locals.srv.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).eq('status', 'unpaid').then(r => ({ count: r.count })),
    locals.srv.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).eq('status', 'partial').then(r => ({ count: r.count })),
  ]);

  const invoiceData = (invoices ?? []).map((i) => ({
    ...i,
    student_name: i.students ? `${i.students.first_name} ${i.students.last_name}` : '—',
    admission_no: i.students?.admission_no ?? '—',
    grade: i.students?.grade ?? '—',
  }));

  return {
    invoices: invoiceData,
    payments: payments ?? [],
    stats: {
      totalStudents: totalStudents ?? 0,
      paid: paidCount ?? 0,
      unpaid: unpaidCount ?? 0,
      partial: partialCount ?? 0,
    },
  };
};
