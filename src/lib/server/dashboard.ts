import { countRecords, countRecordsDistinct } from './query';
import { getRecentStudents, getRecentRemedialStudents } from './students';
import { getRecentInvoices, getUnpaidAmount } from './invoices';
import { getRecentAttendance } from './attendance';
import { PAGE_OVERVIEW } from '$lib/config';

export async function getReclassStats(sb: App.Locals['srv'], tenantId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();

  const [
    groups, teachers, enrolledStudents, sessions,
    unpaid, paidInvoices,
    rs, ri, ta, occ, sum,
  ] = await Promise.all([
    countRecords(sb, 'remedial_groups', tenantId),
    // remedial teachers = distinct teachers assigned to remedial groups
    countRecordsDistinct(sb, 'remedial_groups', tenantId, 'teacher_id'),
    // enrolled remedial students = distinct students in group_members
    countRecordsDistinct(sb, 'group_members', tenantId, 'student_id'),
    countRecords(sb, 'sessions', tenantId),
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
      enrolledStudents,
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

export async function getAdminDashboardStats(sb: App.Locals['srv'], tenantId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();

  const [
    students, teachers, subjects, groups,
    unpaid, paidInvoices,
    rs, ri, ta, occ, sum,
  ] = await Promise.all([
    countRecords(sb, 'students', tenantId),
    countRecords(sb, 'teachers', tenantId),
    countRecords(sb, 'subjects', tenantId),
    countRecords(sb, 'sessions', tenantId),
    countRecords(sb, 'invoices', tenantId, q => q.eq('status', 'unpaid')),
    countRecords(sb, 'invoices', tenantId, q => q.eq('status', 'paid')),
    getRecentStudents(sb, tenantId, PAGE_OVERVIEW),
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
      students, teachers, subjects, sessions: groups,
      unpaid, paidInvoices, unpaidAmount: sum,
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

type Occurrence = { occurs_on?: string | null };

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

type AttendanceRow = {
  id: string; teacher_name?: string; group_name?: string; marked_at?: string | null; status?: string;
};
type InvoiceRow = {
  id: string; student_name?: string; admission_no?: string; amount_paid?: number | null;
  due_date?: string | null; status?: string;
};
type ActivityItem = {
  id: string; name: string; detail: string; time: string;
  kind: 'attendance' | 'payment' | 'session' | 'enrollment'; badge: string;
};

export function buildActivityFeed(ta: AttendanceRow[], ri: InvoiceRow[]): ActivityItem[] {
  return [
    ...(ta ?? []).slice(0, 4).map((a) => ({
      id: `att-${a.id}`,
      name: a.teacher_name ?? 'Teacher',
      detail: a.group_name ?? 'Remedial session',
      time: a.marked_at ? new Date(a.marked_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
      kind: 'attendance' as const,
      badge: a.status === 'present' ? 'Present' : a.status === 'late' ? 'Late' : a.status === 'absent' ? 'Absent' : 'Marked',
    })),
    ...(ri || []).slice(0, 3).map((i) => ({
      id: `pmt-${i.id}`,
      name: i.student_name || 'Unknown',
      detail: `${i.admission_no ? `Adm ${i.admission_no} · ` : ''}KES ${Number(i.amount_paid ?? 0).toLocaleString()} via M-Pesa paybill`,
      time: i.due_date ? new Date(i.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      kind: 'payment' as const,
      badge: i.status === 'paid' ? 'Paid' : i.status === 'partial' ? 'Partial' : 'Pending',
    })),
  ];
}
