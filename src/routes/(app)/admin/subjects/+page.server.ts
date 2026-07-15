import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: subjects } = await locals.supabase
    .from('subjects')
    .select('id, name, code, description, teachers_count, status')
    .order('name');

  return { subjects: subjects ?? [] };
};
