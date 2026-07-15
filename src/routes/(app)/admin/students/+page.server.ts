import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: students } = await locals.supabase
    .from('students')
    .select('id, admission_no, first_name, last_name, grade, status, created_at')
    .order('created_at', { ascending: false });

  return { students: students ?? [] };
};
