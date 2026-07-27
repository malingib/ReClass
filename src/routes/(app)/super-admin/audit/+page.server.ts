import type { PageServerLoad } from './$types';
import { PAGE_LIST_LARGE } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: logs } = await locals.srv
    .from('audit_log')
    .select('id, action, created_at, actor_id, entity, entity_id, before, after')
    .order('created_at', { ascending: false })
    .limit(PAGE_LIST_LARGE);

  return { logs: logs ?? [] };
};
