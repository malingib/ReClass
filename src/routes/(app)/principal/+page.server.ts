import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const db = locals.srv;

  const [studentsRes, teachersRes, sessionsRes, attendanceRes] = await Promise.all([
    db.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId),
    db.from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId),
    db.from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId),
    db.from('teacher_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId)
      .gte('marked_at', since),
  ]);

  const attendanceTotal = attendanceRes.count ?? 0;
  const { count: presentCount } = await db
    .from('teacher_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', locals.tenantId)
    .gte('marked_at', since)
    .in('status', ['present', 'late']);

  const attendanceRate = attendanceTotal ? Math.round(((presentCount ?? 0) / attendanceTotal) * 100) : 0;

  return {
    stats: {
      students: studentsRes.count ?? 0,
      teachers: teachersRes.count ?? 0,
      attendanceRate,
      sessions: sessionsRes.count ?? 0,
    },
  };
};
