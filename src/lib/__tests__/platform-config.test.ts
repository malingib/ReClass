import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260812000005_platform_config.sql'),
  'utf8',
);
const platformConfig = readFileSync(
  join(process.cwd(), 'supabase', 'functions', '_shared', 'platform-config.ts'),
  'utf8',
);
const b2cFn = readFileSync(join(process.cwd(), 'supabase', 'functions', 'b2c', 'index.ts'), 'utf8');
const stkFn = readFileSync(join(process.cwd(), 'supabase', 'functions', 'stk', 'index.ts'), 'utf8');
const callbackFn = readFileSync(
  join(process.cwd(), 'supabase', 'functions', 'mpesa-callback', 'index.ts'),
  'utf8',
);
const b2cResultFn = readFileSync(
  join(process.cwd(), 'supabase', 'functions', 'b2c-result', 'index.ts'),
  'utf8',
);
const credTestFn = readFileSync(
  join(process.cwd(), 'supabase', 'functions', 'credentials-test', 'index.ts'),
  'utf8',
);

describe('platform config security contract', () => {
  it('stores config encrypted at rest in a super-admin-gated table', () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.platform_config/i);
    expect(migration).toMatch(/value_encrypted TEXT/i);
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/current_setting\('app\.role', true\) = 'super_admin'/i);
  });

  it('exposes get/set via service-role-only RPCs', () => {
    expect(migration).toMatch(/FUNCTION public\.get_platform_config/i);
    expect(migration).toMatch(/FUNCTION public\.set_platform_config/i);
    expect(migration).toMatch(/GRANT EXECUTE[\s\S]*TO service_role/i);
    expect(migration).toMatch(/REVOKE ALL[\s\S]*FROM public, anon, authenticated/i);
  });

  it('provides a session-context-free platform credential decrypt RPC', () => {
    expect(migration).toMatch(/FUNCTION public\.decrypt_platform_credential/i);
    expect(migration).toMatch(/WHERE id = p_id AND scope = 'platform'/i);
  });

  it('prefers env vars and falls back to DB config', () => {
    expect(platformConfig).toContain('Deno.env.get');
    expect(platformConfig).toContain("sb.rpc('get_platform_config')");
    expect(platformConfig).toContain('envName');
  });

  it('b2c builds its result URL from platform config and fails without it', () => {
    expect(b2cFn).toContain("getPlatformConfig(supabase, ['public_url'])");
    expect(b2cFn).toContain('PUBLIC_URL_REQUIRED');
    expect(b2cFn).toContain('resultUrl');
  });

  it('stk builds the callback URL from platform config', () => {
    expect(stkFn).toContain("getPlatformConfig(supabase, ['public_url'])");
    expect(stkFn).toContain('mpesa-callback');
  });

  it('callback functions resolve the shared secret via platform config and fail closed', () => {
    expect(callbackFn).toContain("getPlatformConfig(supabase, ['mpesa_callback_secret'])");
    expect(callbackFn).toContain('actual !== callbackSecret');
    expect(b2cResultFn).toContain("getPlatformConfig(supabase, ['mpesa_callback_secret'])");
    expect(b2cResultFn).toContain('actual !== callbackSecret');
  });

  it('credentials-test decrypts platform creds without transacting session config', () => {
    expect(credTestFn).toContain("rpc('decrypt_platform_credential'");
    expect(credTestFn).not.toContain("rpc('set_tenant_context'");
  });
});