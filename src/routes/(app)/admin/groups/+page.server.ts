import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: groups } = await locals.supabase
    .from('remedial_groups')
    .select('id, name, subject, grade, teacher_id, student_count, status')
    .order('name');

  return { groups: groups ?? [] };
};
