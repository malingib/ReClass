import { countRecords } from '../_platform/query';
import { getRecentRemedialStudents } from '../_sis/students';
import { getRecentInvoices, getUnpaidAmount } from '../_finance/invoices';
import { getRecentAttendance } from '../_remedial/attendance';
import { computeTrend, buildActivityFeed } from '../_dashboard/admin-dashboard';
import { PAGE_OVERVIEW } from '$lib/config';

// ReClass (remedial) dashboard stats.
//
// NOTE: remedial_groups / group_members were collapsed into flat `sessions`
// (see migration 20260716000002). All remedial stats are now derived from
// `sessions` (carries class, subject_id, teacher_id) and `teacher_attendance`.
export async function getReclassStats(sb: App.Locals['srv'], tenantId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();

  // Distinct teachers assigned to remedial sessions, and distinct classes.
  const [{ data: sessionTeachers }, { data: sessionClasses }] = await Promise.all([
    sb.from('sessions').select('teacher_id').eq('tenant_id', tenantId).is('deleted_at', null).eq('active', true),
    sb.from('sessions').select('class').eq('tenant_id', tenantId).is('deleted_at', null).eq('active', true),
  ]);
  const teachers = new Set((sessionTeachers ?? []).map((s: { teacher_id?: string | null }) => s.teacher_id).filter(Boolean)).size;
  const groups = new Set((sessionClasses ?? []).map((s: { class?: string | null }) => s.class).filter(Boolean)).size;

  const [
    sessions,
    unpaid, paidInvoices,
    rs, ri, ta, occ, sum,
  ] = await Promise.all([
    countRecords(sb, 'sessions', tenantId, q => q.eq('active', true).is('deleted_at', null)),
    countRecords(sb, 'invoices', tenantId, q => q.eq('status', 'unpaid')),
    countRecords(sb, 'invoices', tenantId, q => q.eq('status', 'paid')),
    getRecentRemedialStudents(sb, tenantId, PAGE_OVERVIEW),
    getRecentInvoices(sb, tenantId, PAGE_OVERVIEW),
    getRecentAttendance(sb, tenantId, since),
    sb.from('session_occurrences').select('id, occurs_on, status').eq('tenant_id', tenantId).gte('occurs_on', since).then(r => r.data ?? []),
    getUnpaidAmount(sb, tenantId),
  ]);

  const total = ta.length;
  const present = ta.filter((a: { status?: string }) => a.status === 'present' || a.status === 'late').length;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return {
    stat: {
      groups,
      teachers,
      enrolledStudents: rs.length,
      sessions,
      unpaid,
      paidInvoices,
      unpaidAmount: sum,
      attendanceRate: rate,
      sessionsCount: occ.length,
    },
    recentStudents: rs,
    recentInvoices: ri,
    trend: computeTrend(occ),
    activity: buildActivityFeed(ta, ri),
    sessionsSummary: [],
  };
}
