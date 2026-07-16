// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.supabase;

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
    sb.from('teacher_attendance').select('*', { count: 'exact', head: true }),
    sb.from('teacher_attendance').select('*', { count: 'exact', head: true }).in('status', ['present', 'late']),
    sb.from('teacher_attendance').select('*', { count: 'exact', head: true }).eq('status', 'absent'),
    sb.from('session_occurrences').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    sb.from('invoices').select('*', { count: 'exact', head: true }),
    sb.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    sb.from('invoices').select('amount_paid').eq('status', 'paid'),
  ]);

  const totalPayments = (revenueSum ?? []).reduce((sum, r: any) => sum + Number(r.amount_paid), 0);
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
