import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: schedules } = await locals.supabase
    .from('sessions')
    .select('id, title, subject, grade, start_time, end_time, day_of_week, status')
    .order('day_of_week');

  return { schedules: schedules ?? [] };
};
