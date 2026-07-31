import { countRecords } from '../_platform/query';
import { getRecentStudents } from '../_sis/students';
import { getRecentAttendance } from '../_remedial/attendance';
import { PAGE_OVERVIEW } from '$lib/config';

type Occurrence = { occurs_on?: string | null };
type AttendanceRow = {
  id: string; teacher_name?: string; group_name?: string; marked_at?: string | null; status?: string;
};
type PaymentRow = {
  id: string; student_name?: string; fee_type?: string; amount?: number | null;
  method?: string; created_at?: string | null; domain?: string;
};
type ActivityItem = {
  id: string; name: string; detail: string; time: string;
  kind: 'attendance' | 'payment' | 'session' | 'enrollment'; badge: string;
};

/** Total collected (sum of paid payments) for a domain, within an optional window. */
async function collected(
  sb: App.Locals['srv'], tenantId: string, domain: 'school' | 'remedial', since?: string,
) {
  let q = sb.from('payments').select('amount', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('domain', domain).eq('status', 'paid');
  if (since) q = q.gte('created_at', since);
  const { count } = await q;
  if (count === null || count === 0) return 0;
  const { data } = await sb.from('payments').select('amount')
    .eq('tenant_id', tenantId).eq('domain', domain).eq('status', 'paid')
    .gte('created_at', since ?? '1970-01-01');
  return (data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount ?? 0), 0);
}

export async function getAdminDashboardStats(sb: App.Locals['srv'], tenantId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [
    students, teachers, subjects, groups,
    rs, ta, occ,
    schoolCollected, remedialCollected, todayPayments,
    recentPayments,
  ] = await Promise.all([
    countRecords(sb, 'students', tenantId),
    countRecords(sb, 'teachers', tenantId),
    countRecords(sb, 'subjects', tenantId),
    countRecords(sb, 'sessions', tenantId),
    getRecentStudents(sb, tenantId, PAGE_OVERVIEW),
    getRecentAttendance(sb, tenantId, since),
    sb.from('session_occurrences').select('id, occurs_on, status').eq('tenant_id', tenantId).gte('occurs_on', since).then(r => r.data ?? []),
    collected(sb, tenantId, 'school'),
    collected(sb, tenantId, 'remedial'),
    countRecords(sb, 'payments', tenantId, q => q.eq('status', 'paid').gte('created_at', todayIso)),
    sb.from('payments').select('id, amount, method, domain, created_at, students(first_name, last_name), fee_types(name)')
      .eq('tenant_id', tenantId).eq('status', 'paid')
      .order('created_at', { ascending: false }).limit(PAGE_OVERVIEW).then(r => r.data ?? []),
  ]);

  const total = ta.length;
  const present = ta.filter((a: { status?: string }) => a.status === 'present' || a.status === 'late').length;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return {
    stat: {
      students, teachers, subjects, sessions: groups,
      schoolCollected, remedialCollected,
      paymentsToday: todayPayments,
      attendanceRate: rate,
      sessionsCount: occ.length,
    },
    recentStudents: rs,
    recentPayments,
    trend: computeTrend(occ),
    activity: buildActivityFeed(ta, recentPayments as PaymentRow[]),
    sessionsSummary: [],
  };
}

export function computeTrend(occ: Occurrence[]): { label: string; value: number }[] {
  const trend: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const dayStr = d.toISOString().slice(0, 10);
    const daySessions = (occ || []).filter((s) => (s.occurs_on || '').slice(0, 10) === dayStr);
    trend.push({ label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: daySessions.length });
  }
  return trend;
}

export function buildActivityFeed(ta: AttendanceRow[], rp: PaymentRow[]): ActivityItem[] {
  return [
    ...(ta ?? []).slice(0, 4).map((a) => ({
      id: `att-${a.id}`,
      name: a.teacher_name ?? 'Teacher',
      detail: a.group_name ?? 'Remedial session',
      time: a.marked_at ? new Date(a.marked_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
      kind: 'attendance' as const,
      badge: a.status === 'present' ? 'Present' : a.status === 'late' ? 'Late' : a.status === 'absent' ? 'Absent' : 'Marked',
    })),
    ...(rp || []).slice(0, 3).map((p) => ({
      id: `pmt-${p.id}`,
      name: p.student_name || 'Unknown',
      detail: `${p.fee_type ? `${p.fee_type} · ` : ''}KES ${Number(p.amount ?? 0).toLocaleString()} via ${p.method ?? 'M-Pesa'}`,
      time: p.created_at ? new Date(p.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      kind: 'payment' as const,
      badge: p.domain === 'remedial' ? 'M-Pesa' : 'Bank',
    })),
  ];
}
