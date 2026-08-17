// Shared dashboard helpers (trend + activity feed builders).
// The old cross-module school dashboard (getAdminDashboardStats) was removed —
// /admin is a module launcher now. These helpers are used by domain dashboards.

type Occurrence = { occurs_on?: string | null };
type AttendanceRow = {
  id: string; teacher_name?: string; group_name?: string; marked_at?: string | null; status?: string;
};
type PaymentRow = {
  id: string; student_name?: string; fee_type?: string; amount?: number | null;
  method?: string | null; created_at?: string | null; domain?: string;
};
type ActivityItem = {
  id: string; name: string; detail: string; time: string;
  kind: 'attendance' | 'payment' | 'session' | 'enrollment'; badge: string;
};

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
