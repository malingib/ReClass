import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getAttendanceForEffectiveness } from '$lib/server/_remedial/attendance';
import { EXPORT_MAX_ROWS } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'principal');

  const [allAttendance, occurrences] = await Promise.all([
    getAttendanceForEffectiveness(locals.srv, tenantId, EXPORT_MAX_ROWS),
    locals.srv.from('session_occurrences').select('id, status, occurs_on').eq('tenant_id', tenantId).limit(EXPORT_MAX_ROWS).then(r => r.data ?? []),
  ]);

  const total = allAttendance.length;
  const present = allAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const overallRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const doneSessions = occurrences.filter((o) => o.status === 'done').length;
  const totalSessions = occurrences.length;

  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trend = last7Days.map(dateStr => {
    const dayOccurrences = occurrences.filter((o) => o.occurs_on?.startsWith(dateStr) ?? false);
    const dayIds = new Set(dayOccurrences.map((o) => o.id));
    const dayAttendance = allAttendance.filter(a => dayIds.has(a.occurrence_id));
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
