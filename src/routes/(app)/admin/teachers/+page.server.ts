import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: teachers } = await locals.supabase
    .from('teachers')
    .select('id, first_name, last_name, email, phone, subjects, status')
    .order('first_name');

  return { teachers: teachers ?? [] };
};
