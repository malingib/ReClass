import type { PageServerLoad } from './$types';
import { countRecords } from '$lib/server/_platform/query';
import { PAGE_LIST_SMALL } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const [totalStudents, totalAttendance, presentCount, recentSessions] = await Promise.all([
    countRecords(locals.srv, 'students', locals.tenantId),
    countRecords(locals.srv, 'teacher_attendance', locals.tenantId),
    countRecords(locals.srv, 'teacher_attendance', locals.tenantId, q => q.in('status', ['present', 'late'])),
    locals.srv.from('session_occurrences')
      .select('id, occurs_on, start_time, status, sessions!inner(id, class, subjects!inner(name))')
      .eq('tenant_id', locals.tenantId)
      .order('occurs_on', { ascending: false })
      .limit(PAGE_LIST_SMALL)
      .then(r => r.data ?? []),
  ]);

  const attendanceRate = totalAttendance ? Math.round((presentCount / totalAttendance) * 100) : 0;

  return {
    stats: { totalStudents, totalAttendance, attendanceRate },
    recentSessions: (recentSessions ?? []).map((s) => ({
      id: s.id,
      occurs_on: s.occurs_on,
      start_time: s.start_time,
      status: s.status,
      session_name: s.sessions?.class ? `${s.sessions.class} — ${s.sessions?.subjects?.name ?? ''}` : (s.sessions?.subjects?.name ?? '—'),
    })),
  };
};
