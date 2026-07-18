import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: timetable } = await locals.srv
    .from('sessions')
    .select('id, class, day_of_week, start_time, end_time')
    .eq('tenant_id', locals.tenantId)
    .order('day_of_week');

  return { timetable: timetable ?? [] };
};
