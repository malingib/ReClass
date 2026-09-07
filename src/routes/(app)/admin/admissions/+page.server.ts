import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: students, error } = await locals.supabase
    .from('students')
    .select('id, admission_number, first_name, last_name, status, class_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    students: error ? [] : students ?? [],
    error: error?.message ?? null
  };
};
