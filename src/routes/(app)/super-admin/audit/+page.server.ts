import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: logs } = await locals.supabase
    .from('audit_log')
    .select('id, action, created_at, user_id, details')
    .order('created_at', { ascending: false })
    .limit(100);

  return { logs: logs ?? [] };
};
