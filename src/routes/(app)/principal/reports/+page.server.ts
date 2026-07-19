import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;

  const [totalStudents, totalAttendance, presentCount, recentSessions] = await Promise.all([
    db.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId)
      .then(r => r.count ?? 0),
    db.from('teacher_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId)
      .then(r => r.count ?? 0),
    db.from('teacher_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId)
      .in('status', ['present', 'late'])
      .then(r => r.count ?? 0),
    db.from('session_occurrences')
      .select('id, occurs_on, start_time, status, sessions!inner(id, class, subjects!inner(name))')
      .eq('tenant_id', locals.tenantId)
      .order('occurs_on', { ascending: false })
      .limit(10)
      .then(r => r.data ?? []),
  ]);

  const attendanceRate = totalAttendance ? Math.round((presentCount / totalAttendance) * 100) : 0;

  return {
    stats: {
      totalStudents,
      totalAttendance,
      attendanceRate,
    },
    recentSessions: (recentSessions ?? []).map((s: any) => ({
      id: s.id,
      occurs_on: s.occurs_on,
      start_time: s.start_time,
      status: s.status,
      session_name: s.sessions?.class ? `${s.sessions.class} — ${s.sessions?.subjects?.name ?? ''}` : (s.sessions?.subjects?.name ?? '—'),
    })),
  };
};
