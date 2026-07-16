import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const db = locals.srv;

  const { count: students } = await db
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', locals.tenantId);

  const { data: timetable } = await db
    .from('sessions')
    .select('id, group_id, day_of_week, start_time, end_time')
    .eq('tenant_id', locals.tenantId)
    .order('day_of_week');

  // teacher_attendance table does not exist in the schema — return empty
  const total = 0;
  const present = 0;
  const rate = 0;

  return {
    stats: {
      students: students ?? 0,
      attendanceRate: rate,
      sessions: timetable?.length ?? 0,
    },
    timetable: timetable ?? [],
    attendance: [],
  };
};
