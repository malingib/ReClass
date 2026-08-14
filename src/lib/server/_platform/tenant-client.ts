import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

const NO_TENANT_TABLES = new Set(['tenants']);

function isRecord(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

export function createTenantClient(
  srv: SupabaseClient<Database>,
  tenantId: string,
): SupabaseClient<Database> {
  return new Proxy(srv, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
          const qb = (target as any).from(table);
          if (NO_TENANT_TABLES.has(table)) return qb;
          return addTenantFilter(qb, tenantId);
        };
      }
      // NOTE: We deliberately do NOT intercept `rpc`. Injecting a phantom
      // `_tenant_id` param broke every RPC call, because PostgREST resolves a
      // function by *exact* parameter names — the extra key made the lookup
      // match no function (PGRST202 "could not find the function"). Tenant
      // isolation for RPCs is the RPC's own responsibility: every tenant-scoped
      // RPC takes `p_tenant_id` explicitly from the caller (single-tenant
      // deployment: isolation here is the RPC's own filter, not the Proxy's).
      // Keeping `rpc` a pass-through makes the call sites below behave as written.
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient<Database>;
}

function addTenantFilter(qb: any, tenantId: string) {
  const WRAP_AFTER = new Set(['select', 'update', 'delete']);
  const INJECT_INTO = new Set(['insert', 'upsert']);

  return new Proxy(qb, {
    get(target, prop) {
      const fn = target[prop];
      if (typeof fn !== 'function') return fn;

      // Bind to the query-builder instance — Postgrest methods rely on `this`
      // (e.g. cloneRequestState); calling them unbound throws at runtime.
      const bound = fn.bind(target);
      const key = String(prop);

      if (WRAP_AFTER.has(key)) {
        return (...args: any[]) => {
          const result = bound(...args);
          return result.eq('tenant_id', tenantId);
        };
      }
      if (INJECT_INTO.has(key)) {
        return (...args: any[]) => {
          const [data, ...rest] = args;
          if (Array.isArray(data)) {
            return bound(
              data.map((item: any) => ({ ...item, tenant_id: tenantId })),
              ...rest,
            );
          }
          if (isRecord(data)) {
            return bound({ ...data, tenant_id: tenantId }, ...rest);
          }
          return bound(data, ...rest);
        };
      }
      return bound;
    },
  });
}
