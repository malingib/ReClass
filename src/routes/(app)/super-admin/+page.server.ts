import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { count: tenants } = await locals.supabase.from('tenants').select('*', { count: 'exact', head: true });
  const { data: audit } = await locals.supabase.from('audit_log').select('id, action, created_at, user_id').order('created_at', { ascending: false }).limit(10);

  return { stats: { tenants: tenants ?? 0 }, audit: audit ?? [] };
};
