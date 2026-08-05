import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260805000005_tenant_bound_credential_decrypt.sql'),
  'utf8',
);
const notify = readFileSync(
  join(process.cwd(), 'supabase', 'functions', 'notify', 'index.ts'),
  'utf8',
);

describe('tenant credential security contract', () => {
  it('binds decryption to tenant and active school credentials', () => {
    expect(migration).toMatch(/FUNCTION public\.decrypt_tenant_credential/i);
    expect(migration).toMatch(/tenant_id\s*=\s*p_tenant/i);
    expect(migration).toMatch(/scope\s*=\s*'tenant'/i);
    expect(migration).toMatch(/is_active\s*=\s*true/i);
    expect(migration).toMatch(/GRANT EXECUTE[\s\S]*TO service_role/i);
  });

  it('uses the tenant-bound RPC in the notification worker', () => {
    expect(notify).toContain("rpc('decrypt_tenant_credential'");
    expect(notify).toContain('p_tenant: n.tenant_id');
  });
});
