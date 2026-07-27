import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { PAGE_LIST_LARGE } from '$lib/config';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = PAGE_LIST_LARGE;
  const offset = (page - 1) * pageSize;

  const [notifRes, statsRes] = await Promise.all([
    locals.srv
      .from('notifications')
      .select('id, channel, recipient, body, status, attempts, last_error, created_at, sent_at, related_type, related_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
    locals.srv
      .from('notifications')
      .select('status')
      .eq('tenant_id', tenantId),
  ]);

  const all = (statsRes.data ?? []) as { status: string }[];
  const counts = {
    total: all.length,
    queued: all.filter(n => n.status === 'queued').length,
    sent: all.filter(n => n.status === 'sent').length,
    failed: all.filter(n => n.status === 'failed').length,
    optout: all.filter(n => n.status === 'optout').length,
  };
  const deliveryRate = counts.total ? Math.round((counts.sent / counts.total) * 100) : 0;

  return {
    notifications: notifRes.data ?? [],
    stats: counts,
    deliveryRate,
    pagination: { page, pageSize, total: counts.total },
  };
};
