import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.supabase;

  const [
    { count: totalStudents },
    { count: totalAttendance },
    { count: presentCount },
    { count: lateCount },
    { count: absentCount },
    { count: excusedCount },
    { data: recentSessions },
  ] = await Promise.all([
    sb.from('students').select('*', { count: 'exact', head: true }),
    sb.from('attendance').select('*', { count: 'exact', head: true }),
    sb.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present'),
    sb.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'late'),
    sb.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'absent'),
    sb.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'excused'),
    sb.from('session_occurrences')
      .select('id, occurs_on, start_time, status, sessions(name)')
      .order('occurs_on', { ascending: false })
      .limit(10),
  ]);

  const total = totalAttendance ?? 1;
  const attendanceRate = Math.round((((presentCount ?? 0) + (lateCount ?? 0)) / total) * 100);

  return {
    stats: {
      totalStudents: totalStudents ?? 0,
      totalAttendance: totalAttendance ?? 0,
      presentCount: presentCount ?? 0,
      lateCount: lateCount ?? 0,
      absentCount: absentCount ?? 0,
      excusedCount: excusedCount ?? 0,
      attendanceRate,
    },
    recentSessions: (recentSessions ?? []).map((s: any) => ({
      ...s,
      session_name: s.sessions?.name ?? '—',
    })),
  };
};
