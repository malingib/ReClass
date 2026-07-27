import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { rateLimitedHeaders, checkRateLimit, RATE_LIMITS } from '$lib/server/rate-limit';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

describe('distributed rate limit migration (20260726000001)', () => {
  const sql = readFileSync(join(migrationsDir, '20260726000001_distributed_rate_limit.sql'), 'utf8');

  it('creates rate_limits table', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.rate_limits/);
  });

  it('defines the atomic rate_limit_hit RPC', () => {
    expect(sql).toMatch(/FUNCTION public\.rate_limit_hit/);
    expect(sql).toMatch(/ON CONFLICT \(bucket_key\) DO UPDATE/);
  });

  it('grants execute only to service_role', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.rate_limit_hit.*FROM public, anon, authenticated/s);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.rate_limit_hit.*TO service_role/s);
  });

  it('enables RLS on the table', () => {
    expect(sql).toMatch(/ALTER TABLE public\.rate_limits ENABLE ROW LEVEL SECURITY/);
  });
});

describe('rateLimitedHeaders', () => {
  it('reports limit as remaining + 1 when allowed', () => {
    const h = rateLimitedHeaders({ allowed: true, remaining: 4, resetIn: 60_000 });
    expect(h['X-RateLimit-Limit']).toBe('5');
    expect(h['X-RateLimit-Remaining']).toBe('4');
    expect(h['X-RateLimit-Reset']).toBe('60');
  });

  it('reports limit as remaining when blocked', () => {
    const h = rateLimitedHeaders({ allowed: false, remaining: 0, resetIn: 30_000 });
    expect(h['X-RateLimit-Limit']).toBe('0');
    expect(h['X-RateLimit-Reset']).toBe('30');
  });
});

describe('checkRateLimit', () => {
  it('returns RPC result when the DB responds', async () => {
    const srv = {
      rpc: async () => ({ data: [{ allowed: false, remaining: 0, reset_in_ms: 12_000 }], error: null }),
    } as never;
    const r = await checkRateLimit(srv, 'k', 'login');
    expect(r.allowed).toBe(false);
    expect(r.resetIn).toBe(12_000);
  });

  it('fails open when the DB errors', async () => {
    const srv = { rpc: async () => ({ data: null, error: new Error('down') }) } as never;
    const r = await checkRateLimit(srv, 'k', 'login');
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(RATE_LIMITS.login.max);
  });

  it('fails open when the RPC throws', async () => {
    const srv = { rpc: async () => { throw new Error('boom'); } } as never;
    const r = await checkRateLimit(srv, 'k', 'global');
    expect(r.allowed).toBe(true);
  });
});
