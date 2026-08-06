import { countRecords } from '../_platform/query';
import { getRecentAttendance } from '../_remedial/attendance';
import { computeTrend, buildActivityFeed } from '../_dashboard/admin-dashboard';
import { PAGE_OVERVIEW } from '$lib/config';

// Remedial dashboard stats.
//
// NOTE: remedial_groups / group_members were collapsed into flat `sessions`
// (see migration 20260716000002). Remedial fees are paid via M-Pesa and tracked
// as payments (domain='remedial') — there is no invoice/balance lifecycle.
export async function getReclassStats(sb: App.Locals['srv'], tenantId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();

  try {
    const [{ data: sessionTeachers }] = await Promise.all([
      sb.from('sessions').select('teacher_id').eq('tenant_id', tenantId).is('deleted_at', null).eq('active', true),
    ]);
    const teachers = new Set((sessionTeachers ?? []).map((s: { teacher_id?: string | null }) => s.teacher_id).filter(Boolean)).size;

    const [
      activeSessions,
      ta, occ,
      mpesaCollected, mpesaPayments,
      recentPayments,
    ] = await Promise.all([
      countRecords(sb, 'sessions', tenantId, q => q.eq('active', true).is('deleted_at', null)),
      getRecentAttendance(sb, tenantId, since),
      sb.from('session_occurrences').select('id, occurs_on, status').eq('tenant_id', tenantId).gte('occurs_on', since).then(r => r.data ?? []),
      sb.from('payments').select('amount').eq('tenant_id', tenantId).eq('domain', 'remedial').eq('status', 'paid').then(r => (r.data ?? []).reduce((s: number, x: { amount: number }) => s + Number(x.amount ?? 0), 0)),
      countRecords(sb, 'payments', tenantId, q => q.eq('domain', 'remedial').eq('status', 'paid')),
      sb.from('payments').select('id, amount, method, created_at, students(first_name, last_name), fee_types(name)')
        .eq('tenant_id', tenantId).eq('domain', 'remedial').eq('status', 'paid')
        .order('created_at', { ascending: false }).limit(PAGE_OVERVIEW).then(r => r.data ?? []),
    ]);

    const total = ta.length;
    const present = ta.filter((a: { status?: string }) => a.status === 'present' || a.status === 'late').length;
    const rate = total ? Math.round((present / total) * 100) : 0;

    return {
      stat: {
        allowedKeys: ['teachers', 'activeSessions', 'mpesaCollected', 'mpesaPayments', 'attendanceRate', 'upcomingOccurrences'],
        teachers,
        activeSessions,
        mpesaCollected,
        mpesaPayments,
        attendanceRate: rate,
        upcomingOccurrences: occ.length,
      },
      recentPayments,
      trend: computeTrend(occ),
      activity: buildActivityFeed(ta, recentPayments as any[]),
      error: null,
    };
  } catch (e) {
    return {
      stat: { teachers: 0, activeSessions: 0, mpesaCollected: 0, mpesaPayments: 0, attendanceRate: 0, upcomingOccurrences: 0 },
      recentPayments: [],
      trend: [],
      activity: [],
      error: e instanceof Error ? e.message : 'Failed to load dashboard data',
    };
  }
}
