// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: parents } = await locals.supabase
    .from('parents')
    .select('id, first_name, last_name, email, phone, students(first_name, last_name)')
    .order('first_name');

  return { parents: parents ?? [] };
};
