import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;
  const countInTable = async (table: string, filter?: { column: string; value: string }) => {
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (locals.tenantId) q = q.eq('tenant_id', locals.tenantId);
    if (filter) q = q.eq(filter.column, filter.value);
    const { count } = await q;
    return count ?? 0;
  };

  const [totalStudents, totalAttendance, presentCount, lateCount, absentCount, excusedCount, recentSessions] =
    await Promise.all([
      countInTable('students'),
      countInTable('attendance'),
      countInTable('attendance', { column: 'status', value: 'present' }),
      countInTable('attendance', { column: 'status', value: 'late' }),
      countInTable('attendance', { column: 'status', value: 'absent' }),
      countInTable('attendance', { column: 'status', value: 'excused' }),
      db.from('session_occurrences')
        .select('id, occurs_on, start_time, status, sessions!inner(id, class, subjects!inner(name))')
        .eq('tenant_id', locals.tenantId)
        .order('occurs_on', { ascending: false })
        .limit(10)
        .then(r => r.data ?? []),
    ]);

  const total = totalAttendance || 1;
  const attendanceRate = Math.round(((presentCount + lateCount) / total) * 100);

  return {
    stats: {
      totalStudents,
      totalAttendance,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
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
