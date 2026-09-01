import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: tenants, error } = await locals.adminSrv
    .from('tenants')
    .select('id, name, slug, logo_url, brand_primary, currency, timezone, academic_year, created_at')
    .order('created_at', { ascending: false });

  if (error) console.error('super-admin/tenants load:', error);

  const list = tenants ?? [];
  // Per-tenant distinct user counts (not role rows)
  const tenantIds = list.map((t) => t.id);
  let counts: Record<string, number> = {};
  if (tenantIds.length) {
    const { data: rows } = await locals.adminSrv
      .from('user_roles')
      .select('tenant_id, user_id')
      .in('tenant_id', tenantIds);
    const seen = new Set<string>();
    for (const r of rows ?? []) {
      const key = `${r.tenant_id}:${r.user_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        counts[r.tenant_id] = (counts[r.tenant_id] ?? 0) + 1;
      }
    }
  }

  return { tenants: list, counts };
};
