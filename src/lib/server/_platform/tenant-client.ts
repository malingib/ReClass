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
      if (prop === 'rpc') {
        return (fn: string, params?: Record<string, unknown>) => {
          return (target as any).rpc(fn, {
            ...params,
            _tenant_id: tenantId,
          });
        };
      }
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

      if (WRAP_AFTER.has(prop)) {
        return (...args: any[]) => {
          const result = fn(...args);
          return result.eq('tenant_id', tenantId);
        };
      }
      if (INJECT_INTO.has(prop)) {
        return (...args: any[]) => {
          const [data, ...rest] = args;
          if (Array.isArray(data)) {
            return fn(
              data.map((item: any) => ({ ...item, tenant_id: tenantId })),
              ...rest,
            );
          }
          if (isRecord(data)) {
            return fn({ ...data, tenant_id: tenantId }, ...rest);
          }
          return fn(data, ...rest);
        };
      }
      return fn.bind(target);
    },
  });
}
