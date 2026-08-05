import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { suiteModules } from '$lib/modules';

// Super admin provisions which modules each tenant can use.
// System-level table — no tenant filter (super admin only).

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'super_admin');

  const [{ data: tenants }, { data: rows }] = await Promise.all([
    locals.srv.from('tenants').select('id, name, slug').order('name'),
    locals.srv.from('tenant_modules').select('tenant_id, module_id, enabled'),
  ]);

  // Provisionable modules = available picker modules (platform is infra, always on).
  const modules = suiteModules.filter(m => m.status === 'available');
  const enabledMap = new Map<string, Set<string>>();
  for (const r of rows ?? []) {
    if (!enabledMap.has(r.tenant_id)) enabledMap.set(r.tenant_id, new Set());
    if (r.enabled) enabledMap.get(r.tenant_id)!.add(r.module_id);
  }

  return {
    modules,
    tenants: (tenants ?? []).map((t) => ({
      ...t,
      enabled: enabledMap.get(t.id) ?? new Set<string>(),
    })),
  };
};

export const actions: Actions = {
  toggle: async ({ locals, request }) => {
    requireTenantRole(locals, 'super_admin');
    const fd = await request.formData();
    const tenantId = String(fd.get('tenant_id') ?? '');
    const moduleId = String(fd.get('module_id') ?? '');
    const enabled = fd.get('enabled') === 'true';

    if (!tenantId || !moduleId) return { error: 'Missing tenant or module.' };

    // Upsert the row with the new enabled state. A missing row means the
    // module is implicitly enabled (fail-open default), so toggling to
    // "disabled" inserts enabled=false; toggling to "enabled" ensures true.
    const { error } = await locals.srv.from('tenant_modules').upsert(
      { tenant_id: tenantId, module_id: moduleId, enabled },
      { onConflict: 'tenant_id,module_id' },
    );

    if (error) return { error: error.message };
    return { success: true as const, tenantId, moduleId, enabled };
  },
};
