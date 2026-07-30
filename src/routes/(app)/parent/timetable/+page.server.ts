import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { timetable: [] };

  const { data: grades } = await locals.srv
    .from('students')
    .select('grade')
    .eq('tenant_id', tenantId)
    .in('id', studentIds);
  const classes = [...new Set((grades ?? []).map((student) => student.grade).filter(Boolean))] as string[];
  if (classes.length === 0) return { timetable: [] };

  const { data: timetable } = await locals.srv
    .from('sessions')
    .select('id, class, day_of_week, start_time, end_time')
    .eq('tenant_id', tenantId)
    .in('class', classes)
    .eq('active', true)
    .order('day_of_week');

  return { timetable: timetable ?? [] };
};
