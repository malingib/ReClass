// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;
  const tenantFilter = locals.tenantId ? (q: any) => q.eq('tenant_id', locals.tenantId) : (q: any) => q;

  // Get teacher attendance stats
  let q = db.from('teacher_attendance').select('id, status, marked_at, occurrence_id, teacher_id', { count: 'exact', head: false });
  if (locals.tenantId) q = q.eq('tenant_id', locals.tenantId);
  q = q.limit(10000);
  const { data: allAttendance } = await q;

  const total = allAttendance?.length ?? 0;
  const present = (allAttendance ?? []).filter(a => a.status === 'present' || a.status === 'late').length;
  const morning = (allAttendance ?? []).filter(a => a.status === 'present');
  const evening = (allAttendance ?? []).filter(a => a.status === 'late' || a.status === 'absent');
  const overallRate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Get total sessions covered
  let sq = db.from('session_occurrences').select('id, status, occurs_on', { count: 'exact', head: false });
  if (locals.tenantId) sq = sq.eq('tenant_id', locals.tenantId);
  sq = sq.limit(10000);
  const { data: occurrences } = await sq;
  const doneSessions = (occurrences ?? []).filter(o => o.status === 'done').length;
  const totalSessions = occurrences?.length ?? 0;

  // Build trend data: attendance rate per day in last 7 days
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trend = last7Days.map(dateStr => {
    const dayOccurrences = (occurrences ?? []).filter(o =>
      o.occurs_on?.startsWith(dateStr)
    );
    const dayIds = dayOccurrences.map(o => o.id);
    const dayAttendance = (allAttendance ?? []).filter(a =>
      dayIds.includes(a.occurrence_id)
    );
    const dayTotal = dayAttendance.length;
    const dayPresent = dayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const rate = dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0;
    const date = new Date(dateStr);
    return {
      label: dayLabels[date.getDay()],
      value: rate,
    };
  });

  const summary = [
    { label: 'Overall Rate', value: `${overallRate}%`, sub: 'Across all sessions' },
    { label: 'Present Sessions', value: `${present}`, sub: `Of ${total} total records` },
    { label: 'Sessions Covered', value: `${doneSessions}`, sub: `${totalSessions} total occurrences` },
    { label: 'Total Sessions', value: `${totalSessions}`, sub: 'This term' },
  ];

  return { trend, summary };
};
