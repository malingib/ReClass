import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

export const MODULE_LOOKUP_TIMEOUT_MS = 3000;

// ── In-memory cache for enabled modules ──────────────────────────────────────
// Module provisioning changes rarely (super-admin action). Caching avoids a
// database round-trip on every single page navigation while staying fresh.
const MODULE_CACHE_TTL_MS = 60_000; // 60 s
// Keyed by tenant id alone — the query never depends on role (super_admin
// short-circuits before the cache), so role-based keys were pure duplication.
const moduleCache = new Map<string, { data: string[] | null; ts: number }>();

/** Purge stale entries every 5 minutes (lazy sweep on access). */
let lastSweep = Date.now();
function maybeSweepCache() {
  const now = Date.now();
  if (now - lastSweep < 300_000) return;
  lastSweep = now;
  for (const [k, v] of moduleCache) {
    if (now - v.ts > MODULE_CACHE_TTL_MS) moduleCache.delete(k);
  }
}

/**
 * Module provisioning — the super admin decides which modules a tenant can use.
 *
 * Returns the list of enabled module ids for a tenant. Semantics:
 * - super_admin sees everything (platform-level role, no tenant scoping).
 * - A tenant with NO tenant_modules rows at all fails open to ALL modules —
 *   the safety net for a tenant that was never provisioned (new tenants are
 *   seeded automatically by the DB trigger, so this is normally unreachable).
 * - Rows present but nothing enabled = the super admin switched it all off.
 *   That intent is honored: an empty list blocks everything (no implicit
 *   fail-open). alwaysOn modules (sis/platform) are exempt in the guard.
 */
export async function getEnabledModules(
  db: SupabaseClient<Database>,
  tenantId: string,
  role: string | null,
): Promise<string[] | null> {
  if (role === 'super_admin') return null; // null = all modules

  // Check cache first
  maybeSweepCache();
  const cached = moduleCache.get(tenantId);
  if (cached && Date.now() - cached.ts < MODULE_CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODULE_LOOKUP_TIMEOUT_MS);
  try {
    const { data, error } = await db
      .from('tenant_modules')
      .select('module_id, enabled')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .abortSignal(controller.signal);

    if (error) throw new Error('Module provisioning lookup failed');

    const rows = data ?? [];
    if (rows.length === 0) {
      // Tenant was never provisioned (no rows at all) — fail open. Practically
      // unreachable: the rename migration re-seeds existing tenants and the
      // AFTER INSERT trigger seeds new ones. A cached null here self-corrects
      // within the TTL (or on the next toggle invalidation).
      moduleCache.set(tenantId, { data: null, ts: Date.now() });
      return null;
    }
    // Rows exist — honor exactly what is enabled; an empty list is "nothing on".
    const ids = [...new Set(rows.filter((r) => r.enabled).map((r) => r.module_id))];
    moduleCache.set(tenantId, { data: ids, ts: Date.now() });
    return ids;
  } finally {
    clearTimeout(timeout);
  }
}

/** Invalidate cache after module provisioning changes (call from admin endpoints). */
export function invalidateModuleCache(tenantId?: string) {
  if (tenantId) {
    // The cache key is the bare tenant id.
    moduleCache.delete(tenantId);
  } else {
    moduleCache.clear();
  }
}

/** True when a module id is in the enabled set (null set = all enabled). */
export function isModuleEnabled(enabledModules: string[] | null, moduleId: string): boolean {
  return enabledModules === null || enabledModules.includes(moduleId);
}
