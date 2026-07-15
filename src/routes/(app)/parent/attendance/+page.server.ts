import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: attendance } = await locals.supabase
    .from('student_attendance')
    .select('id, status, date, student_id, students(first_name, last_name)')
    .order('date', { ascending: false })
    .limit(50);

  return { attendance: attendance ?? [] };
};
