import { describe, it, expect } from 'vitest';
import { createTenantClient } from '$lib/server/_platform/tenant-client';

// Minimal fake of the Supabase client surface the Proxy touches. Every builder
// method records itself so we can assert what the Proxy did.
function makeFakeClient() {
  const makeBuilder = () => {
    const calls: { method: string; args: unknown[] }[] = [];
    const record = (method: string) => (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
    const builder: any = {
      select: record('select'),
      insert: record('insert'),
      upsert: record('upsert'),
      update: record('update'),
      delete: record('delete'),
      eq: record('eq'),
    };
    builder.__calls = calls;
    return builder;
  };

  const fromCalls: { table: string; builder: any }[] = [];
  const rpcCalls: { fn: string; params: Record<string, unknown> }[] = [];

  const client: any = {
    from: (table: string) => {
      const b = makeBuilder();
      fromCalls.push({ table, builder: b });
      return b;
    },
    rpc: (fn: string, params?: Record<string, unknown>) => {
      rpcCalls.push({ fn, params: params ?? {} });
      return Promise.resolve({ data: null, error: null });
    },
  };

  return { client, fromCalls, rpcCalls };
}

describe('createTenantClient', () => {
  const TENANT = '11111111-1111-1111-1111-111111111111';

  it('injects tenant_id.eq on .from().select() chains', () => {
    const { client, fromCalls } = makeFakeClient();
    const proxied = createTenantClient(client, TENANT) as any;
    proxied.from('students').select('*');
    expect(fromCalls).toHaveLength(1);
    expect(fromCalls[0].table).toBe('students');
    const eqCalls = fromCalls[0].builder.__calls.filter((c: any) => c.method === 'eq');
    expect(eqCalls.some((c: any) => c.args[0] === 'tenant_id' && c.args[1] === TENANT)).toBe(true);
  });

  it('does NOT scope the tenants table', () => {
    const { client, fromCalls } = makeFakeClient();
    const proxied = createTenantClient(client, TENANT) as any;
    proxied.from('tenants').select('*');
    const eqCalls = fromCalls[0].builder.__calls.filter((c: any) => c.method === 'eq');
    expect(eqCalls.some((c: any) => c.args[0] === 'tenant_id')).toBe(false);
  });

  it('injects tenant_id into the insert payload object', () => {
    const { client, fromCalls } = makeFakeClient();
    const proxied = createTenantClient(client, TENANT) as any;
    proxied.from('invoices').insert({ amount: 100 });
    const insert = fromCalls[0].builder.__calls.find((c: any) => c.method === 'insert');
    expect(insert).toBeTruthy();
    const payload = insert.args[0] as Record<string, unknown>;
    expect(payload.tenant_id).toBe(TENANT);
    expect((payload.amount as number)).toBe(100);
  });

  it('is a PASS-THROUGH for .rpc() — no phantom _tenant_id (was a bug)', () => {
    const { client, rpcCalls } = makeFakeClient();
    const proxied = createTenantClient(client, TENANT) as any;
    proxied.rpc('review_teacher_attendance', {
      p_tenant_id: TENANT,
      p_profile_id: 'abc',
      p_attendance_id: 'def',
      p_decision: 'approved',
    });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('review_teacher_attendance');
    // The fix: the Proxy must NOT add a phantom `_tenant_id` key. PostgREST
    // resolves functions by exact parameter name, so such a key would make the
    // call resolve to "function does not exist" (PGRST202) and break the form.
    expect('_tenant_id' in rpcCalls[0].params).toBe(false);
    expect(rpcCalls[0].params).toEqual({
      p_tenant_id: TENANT,
      p_profile_id: 'abc',
      p_attendance_id: 'def',
      p_decision: 'approved',
    });
  });

  it('passes rpc params through unchanged when none given', () => {
    const { client, rpcCalls } = makeFakeClient();
    const proxied = createTenantClient(client, TENANT) as any;
    proxied.rpc('get_platform_config');
    expect(rpcCalls[0].fn).toBe('get_platform_config');
    expect(rpcCalls[0].params).toEqual({});
  });
});
