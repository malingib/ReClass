import type { PageServerLoad } from './$types';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  const { data: timetable } = await locals.srv
    .from('sessions')
    .select('id, class, day_of_week, start_time, end_time, room, subjects(name)')
    .eq('tenant_id', tenantId)
    .eq('teacher_id', teacher.id)
    .eq('active', true)
    .order('day_of_week')
    .order('start_time');

  const mapped = (timetable ?? []).map((s: any) => ({
    ...s,
    subject: s.subjects?.name ?? '—',
    day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][((s.day_of_week ?? 1) - 1)] ?? String(s.day_of_week ?? ''),
    time: `${(s.start_time ?? '').slice(0,5)} – ${(s.end_time ?? '').slice(0,5)}`,
  }));
  return { timetable: mapped };
};
