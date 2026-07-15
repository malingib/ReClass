import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: timetable } = await locals.supabase
    .from('sessions')
    .select('id, title, subject, grade, start_time, end_time, day_of_week')
    .order('day_of_week');

  return { timetable: timetable ?? [] };
};
