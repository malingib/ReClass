import type { PageServerLoad } from './$types';
import { PAGE_LIST_SMALL } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { count: tenants } = await locals.srv.from('tenants').select('*', { count: 'exact', head: true });
  const { data: audit } = await locals.srv.from('audit_log').select('id, action, created_at, actor_id').order('created_at', { ascending: false }).limit(PAGE_LIST_SMALL);

  return { stats: { tenants: tenants ?? 0 }, audit: audit ?? [] };
};
