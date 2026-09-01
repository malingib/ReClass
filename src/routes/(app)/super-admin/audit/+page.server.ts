import type { PageServerLoad } from './$types';
import { PAGE_LIST_LARGE } from '$lib/config';

export const load: PageServerLoad = async ({ locals, url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const search = (url.searchParams.get('search') ?? '').trim();
  const clean = search.replace(/[,()]/g, '').replace(/%/g, '\\%');
  const pageSize = PAGE_LIST_LARGE;
  const offset = (page - 1) * pageSize;

  let countQ = locals.adminSrv.from('audit_log').select('*', { count: 'exact', head: true });
  if (clean) countQ = countQ.or(`action.ilike.%${clean}%,entity.ilike.%${clean}%`);
  const { count } = await countQ;

  let q = locals.adminSrv.from('audit_log').select('id, action, created_at, actor_id, entity, entity_id, before, after').order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
  if (clean) q = q.or(`action.ilike.%${clean}%,entity.ilike.%${clean}%`);
  const { data: logs } = await q;

  return { logs: logs ?? [], pagination: { total: count ?? 0, page, pageSize, search, sortKey: 'created_at', sortDir: 'desc' as const } };
};
