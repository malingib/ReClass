// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;

  // Helper to apply tenant filter
  const applyTenant = (q: any) => {
    if (locals.tenantId) return q.eq('tenant_id', locals.tenantId);
    return q;
  };

  // Get counts/aggregates for each report card
  const [
    { count: attendanceTotal },
    { count: attendancePresent },
    { count: attendanceAbsent },
    { count: sessionsCovered },
    { count: totalInvoices },
    { count: paidInvoices },
    { data: revenueSum },
  ] = await Promise.all([
    applyTenant(db.from('teacher_attendance').select('*', { count: 'exact', head: true })),
    applyTenant(db.from('teacher_attendance').select('*', { count: 'exact', head: true }).in('status', ['present', 'late'])),
    applyTenant(db.from('teacher_attendance').select('*', { count: 'exact', head: true }).eq('status', 'absent')),
    applyTenant(db.from('session_occurrences').select('*', { count: 'exact', head: true }).eq('status', 'done')),
    applyTenant(db.from('invoices').select('*', { count: 'exact', head: true })),
    applyTenant(db.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid')),
    applyTenant(db.from('invoices').select('amount_paid').eq('status', 'paid')),
  ]);

  const totalPayments = (revenueSum ?? []).reduce((sum: number, r: any) => sum + Number(r.amount_paid), 0);
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
