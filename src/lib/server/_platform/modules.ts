import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

export const MODULE_LOOKUP_TIMEOUT_MS = 3000;

/**
 * Module provisioning — the super admin decides which modules a tenant can use.
 *
 * Returns the list of enabled module ids for a tenant. Semantics:
 * - super_admin sees everything (platform-level role, no tenant scoping).
 * - A tenant with NO tenant_modules rows fails open to ALL modules (fresh
 *   tenants see everything until the super admin provisions them).
 * - Otherwise only modules with enabled=true are returned.
 */
export async function getEnabledModules(
  db: SupabaseClient<Database>,
  tenantId: string,
  role: string | null,
): Promise<string[] | null> {
  if (role === 'super_admin') return null; // null = all modules

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODULE_LOOKUP_TIMEOUT_MS);
  try {
    const { data, error } = await db
      .from('tenant_modules')
      .select('module_id')
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .is('deleted_at', null)
      .abortSignal(controller.signal);

    if (error) throw new Error('Module provisioning lookup failed');

    const ids = (data ?? []).map((r) => r.module_id);
    // A successful empty result means the tenant has not been provisioned yet.
    return ids.length > 0 ? ids : null;
  } finally {
    clearTimeout(timeout);
  }
}

/** True when a module id is in the enabled set (null set = all enabled). */
export function isModuleEnabled(enabledModules: string[] | null, moduleId: string): boolean {
  return enabledModules === null || enabledModules.includes(moduleId);
}
