import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: users } = await locals.supabase
    .from('user_roles')
    .select('id, user_id, role, profiles(full_name, email)')
    .order('role');

  return { users: users ?? [] };
};
