import type { PageServerLoad } from './$types';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  const { data: timetable } = await locals.srv
    .from('sessions')
    .select('id, class, day_of_week, start_time, end_time')
    .eq('tenant_id', tenantId)
    .eq('teacher_id', teacher.id)
    .eq('active', true)
    .order('day_of_week');

  return { timetable: timetable ?? [] };
};
