import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: fees } = await locals.supabase
    .from('fees')
    .select('id, name, amount, grade, frequency, status')
    .order('name');

  return { fees: fees ?? [] };
};
