import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { EXPORT_BURSA_MAX_ROWS } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');

  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();

  const [
    { data: payments },
    { count: totalStudents },
    { count: mpesaCount },
    { count: bankCount },
    { count: totalPaidCount },
  ] = await Promise.all([
    locals.srv
      .from('payments')
      .select(`
        id, amount, method, domain, mpesa_receipt, phone, status, receipt_no, created_at,
        students(first_name, last_name, admission_no, grade),
        fee_types(name)
      `)
      .eq('tenant_id', locals.tenantId)
      .eq('status', 'paid')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(EXPORT_BURSA_MAX_ROWS),
    locals.srv.from('students').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).then(r => ({ count: r.count })),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).eq('domain', 'remedial').eq('status', 'paid').then(r => ({ count: r.count })),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).eq('domain', 'school').eq('status', 'paid').then(r => ({ count: r.count })),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId).eq('status', 'paid').then(r => ({ count: r.count })),
  ]);

  const paymentData = (payments ?? []).map((p: any) => ({
    ...p,
    student_name: p.students ? `${p.students.first_name} ${p.students.last_name}` : '—',
    admission_no: p.students?.admission_no ?? '—',
    grade: p.students?.grade ?? '—',
    fee_type: p.fee_types?.name ?? '—',
  }));

  return {
    payments: paymentData,
    stats: {
      totalStudents: totalStudents ?? 0,
      paid: mpesaCount ?? 0,
      unpaid: bankCount ?? 0,
      totalReceipts: totalPaidCount ?? 0,
    },
  };
};
