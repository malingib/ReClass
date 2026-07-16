import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  return {
    fullName: user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Admin',
  };
};
