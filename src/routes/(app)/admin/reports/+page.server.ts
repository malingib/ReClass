import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const db = locals.srv;

  const tenantFilter = <T extends { eq: (col: string, val: string) => T }>(q: T) =>
    q.eq('tenant_id', tenantId);

  const [
    { count: attendanceTotal },
    { count: attendancePresent },
    { count: attendanceAbsent },
    { count: sessionsCovered },
    { count: totalInvoices },
    { count: paidInvoices },
    { data: revenueSum },
  ] = await Promise.all([
    tenantFilter(db.from('teacher_attendance').select('*', { count: 'exact', head: true })),
    tenantFilter(db.from('teacher_attendance').select('*', { count: 'exact', head: true }).in('status', ['present', 'late'])),
    tenantFilter(db.from('teacher_attendance').select('*', { count: 'exact', head: true }).eq('status', 'absent')),
    tenantFilter(db.from('session_occurrences').select('*', { count: 'exact', head: true }).eq('status', 'done')),
    tenantFilter(db.from('invoices').select('*', { count: 'exact', head: true })),
    tenantFilter(db.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid')),
    tenantFilter(db.from('invoices').select('amount_paid').eq('status', 'paid')),
  ]);

  const totalPayments = (revenueSum ?? []).reduce((sum, r) => sum + Number(r.amount_paid), 0);
  const attendanceRate = attendanceTotal ? Math.round(((attendancePresent ?? 0) / attendanceTotal) * 100) : 0;

  return {
    stats: {
      attendanceTotal: attendanceTotal ?? 0,
      attendanceRate,
      absenteeCount: attendanceAbsent ?? 0,
      sessionsCovered: sessionsCovered ?? 0,
      totalInvoices: totalInvoices ?? 0,
      paidInvoices: paidInvoices ?? 0,
      totalPayments,
    },
  };
};
