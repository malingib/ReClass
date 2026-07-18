import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isRole, roleRoutes, roleLabels, type Role } from '$lib/auth';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

describe('tenant isolation — money path', () => {
  const rpc = readFileSync(join(migrationsDir, '20260713000003_reconcile_payment.sql'), 'utf8');

  it('reconcile_payment scopes the invoice lookup by p_tenant_id', () => {
    // The invoice selected for crediting must be filtered to the caller's tenant,
    // otherwise a callback could credit a different school's invoice.
    expect(rpc).toMatch(/WHERE\s+tenant_id\s*=\s*p_tenant_id/i);
  });

  it('reconcile_payment writes payments/invoices with p_tenant_id', () => {
    // Both the invoice lookup and the inserted payment carry the caller's tenant.
    expect(rpc).toMatch(/INTO\s+public\.payments\s*\([^)]*tenant_id/i);
    expect(rpc).toMatch(/p_tenant_id/i);
  });

  it('reconcile_payment is SECURITY DEFINER and granted only to service_role', () => {
    expect(rpc).toContain('SECURITY DEFINER');
    expect(rpc).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.reconcile_payment[^\n]*TO\s+service_role/i);
  });
});

describe('role model', () => {
  const roles = Object.keys(roleRoutes) as Role[];

  it('every role maps to a non-empty route', () => {
    for (const r of roles) {
      expect(roleRoutes[r]).toMatch(/^\/[a-z-]+$/);
    }
  });

  it('every role has a human label', () => {
    for (const r of roles) {
      expect(roleLabels[r]).toBeTruthy();
    }
  });

  it('isRole accepts only known roles', () => {
    expect(isRole('school_admin')).toBe(true);
    expect(isRole('hacker')).toBe(false);
    expect(isRole('')).toBe(false);
  });

  it('roleRoutes covers all six roles', () => {
    expect(roles.sort()).toEqual(
      ['bursar', 'parent', 'principal', 'school_admin', 'super_admin', 'teacher'].sort()
    );
  });
});
