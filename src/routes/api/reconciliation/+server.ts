import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const GET: RequestHandler = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const db = locals.srv;

  const [pendingRes, failedRes, totalRes] = await Promise.all([
    db.from('checkout_requests')
      .select('count', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending'),
    db.from('checkout_requests')
      .select('count', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'failed'),
    db.from('checkout_requests')
      .select('count', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'eq', 'pending'),
  ]);

  return json({
    pending: pendingRes.count ?? 0,
    failed: failedRes.count ?? 0,
    reconciled: totalRes.count ?? 0,
    unreconciled: (pendingRes.count ?? 0) + (failedRes.count ?? 0),
  });
};
