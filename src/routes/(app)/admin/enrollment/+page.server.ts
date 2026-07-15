import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: enrollments } = await locals.supabase
    .from('students')
    .select('id, admission_no, first_name, last_name, grade, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return { enrollments: enrollments ?? [] };
};
