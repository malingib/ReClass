import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

export const MODULE_LOOKUP_TIMEOUT_MS = 3000;

// ── In-memory cache for enabled modules ──────────────────────────────────────
// Module provisioning changes rarely (super-admin action). Caching avoids a
// database round-trip on every single page navigation while staying fresh.
const MODULE_CACHE_TTL_MS = 60_000; // 60 s
const moduleCache = new Map<string, { data: string[] | null; ts: number }>();

function cacheKey(tenantId: string, role: string | null): string {
  return `${tenantId}::${role ?? 'none'}`;
}

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

  // Check cache first
  maybeSweepCache();
  const key = cacheKey(tenantId, role);
  const cached = moduleCache.get(key);
  if (cached && Date.now() - cached.ts < MODULE_CACHE_TTL_MS) {
    return cached.data;
  }

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
    const result = ids.length > 0 ? ids : null;

    moduleCache.set(key, { data: result, ts: Date.now() });
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

/** Invalidate cache after module provisioning changes (call from admin endpoints). */
export function invalidateModuleCache(tenantId?: string) {
  if (tenantId) {
    for (const k of moduleCache.keys()) {
      if (k.startsWith(tenantId + '::')) moduleCache.delete(k);
    }
  } else {
    moduleCache.clear();
  }
}

/** True when a module id is in the enabled set (null set = all enabled). */
export function isModuleEnabled(enabledModules: string[] | null, moduleId: string): boolean {
  return enabledModules === null || enabledModules.includes(moduleId);
}
