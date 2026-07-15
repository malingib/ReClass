import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: credentials } = await locals.supabase
    .from('credentials')
    .select('id, name, type, status, created_at')
    .order('created_at', { ascending: false });

  return { credentials: credentials ?? [] };
};
