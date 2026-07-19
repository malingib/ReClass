import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;

  const { count: students } = await db
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', locals.tenantId);

  const { data: timetable } = await db
    .from('sessions')
    .select('id, class, day_of_week, start_time, end_time')
    .eq('tenant_id', locals.tenantId)
    .order('day_of_week');

  return {
    stats: {
      students: students ?? 0,
      sessions: timetable?.length ?? 0,
    },
    timetable: timetable ?? [],
  };
};
