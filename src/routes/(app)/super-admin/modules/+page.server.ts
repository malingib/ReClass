import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { suiteModules, MODULE_LIST, type SuiteModule } from '$lib/modules';
import { invalidateModuleCache, normalizeModuleId } from '$lib/server/_platform/modules';

// Super admin provisions which modules each tenant can use.
// System-level table — no tenant filter (super admin only).

// Only provisionable modules can be toggled. alwaysOn modules (sis/platform)
// are rendered as locked badges and rejected by the toggle action — a typo or
// a tampered form can never create a garbage tenant_modules row.
const provisionableIds = new Set<string>(
  MODULE_LIST.filter((m) => m.provisionable && m.status === 'available').map((m) => m.id),
);

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'super_admin');

  const [{ data: tenants }, { data: rows }] = await Promise.all([
    locals.srv.from('tenants').select('id, name, slug').order('name'),
    locals.srv.from('tenant_modules').select('tenant_id, module_id, enabled'),
  ]);

  const modules = suiteModules.filter((m) => provisionableIds.has(m.id));
  // Always-on modules shown as locked badges: non-provisionable picker
  // modules (sis) plus the platform infrastructure (never a picker card).
  const locked: SuiteModule[] = [
    ...suiteModules.filter((m) => m.status === 'available' && !provisionableIds.has(m.id)),
    {
      id: 'platform',
      name: 'Platform',
      description: 'Infrastructure — settings, integrations, users.',
      status: 'available',
      href: undefined,
      icon: 'reports',
      accent: 'slate',
    },
  ];

  // Count enabled provisionable modules only (alwaysOn rows like sis are inert).
  // Legacy 'reclass' rows count as 'remedial' until the rename migration lands.
  const enabledMap = new Map<string, Set<string>>();
  for (const r of rows ?? []) {
    const id = normalizeModuleId(r.module_id);
    if (!r.enabled || !provisionableIds.has(id)) continue;
    if (!enabledMap.has(r.tenant_id)) enabledMap.set(r.tenant_id, new Set());
    enabledMap.get(r.tenant_id)!.add(id);
  }

  return {
    modules,
    locked,
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
    if (!provisionableIds.has(moduleId)) {
      return { error: `'${moduleId}' is not a provisionable module.` };
    }

    // Upsert the row with the new enabled state. A missing row means the
    // module is implicitly enabled (fail-open default), so toggling to
    // "disabled" inserts enabled=false; toggling to "enabled" ensures true.
    const { error } = await locals.srv.from('tenant_modules').upsert(
      { tenant_id: tenantId, module_id: moduleId, enabled },
      { onConflict: 'tenant_id,module_id' },
    );

    if (error) return { error: error.message };

    // Mirror the toggle onto a legacy 'reclass' row — but only if one still
    // exists. Once the rename migration lands there is no legacy row, so the
    // bridge never resurrects one; before it lands, a stale reclass=true would
    // otherwise keep the module enabled through the read-time normalization.
    if (moduleId === 'remedial') {
      const { data: legacy } = await locals.srv
        .from('tenant_modules')
        .select('module_id')
        .eq('tenant_id', tenantId)
        .eq('module_id', 'reclass')
        .is('deleted_at', null)
        .maybeSingle();
      if (legacy) {
        const { error: mirrorError } = await locals.srv.from('tenant_modules').upsert(
          { tenant_id: tenantId, module_id: 'reclass', enabled },
          { onConflict: 'tenant_id,module_id' },
        );
        if (mirrorError) return { error: mirrorError.message };
      }
    }

    // Bust the in-memory module cache so the tenant's next page load sees
    // the updated provisioning immediately.
    invalidateModuleCache(tenantId);

    return { success: true as const, tenantId, moduleId, enabled };
  },
};
