import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isRole, roleRoutes, roleLabels, type Role } from '$lib/auth';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

describe('reconcile_payment (receipts — no invoice lifecycle)', () => {
  const rpc = readFileSync(join(migrationsDir, '20260731000001_drop_invoice_lifecycle.sql'), 'utf8');

  it('accepts 4 arguments including p_tenant_id', () => {
    expect(rpc).toMatch(/FUNCTION\s+public\.reconcile_payment\s*\(/);
    expect(rpc).toMatch(/p_tenant_id\s+uuid/);
    expect(rpc).toMatch(/p_checkout_id\s+text/);
    expect(rpc).toMatch(/p_amount\s+numeric/);
    expect(rpc).toMatch(/p_phone\s+text/);
  });

  it('rejects non-positive amounts', () => {
    expect(rpc).toMatch(/IF\s+p_amount\s*<=\s*0/i);
    expect(rpc).toMatch(/'invalid_amount'/i);
  });

  it('detects duplicate checkout_id and marks paid', () => {
    expect(rpc).toMatch(/mpesa_checkout_id\s*=\s*p_checkout_id/i);
    expect(rpc).toMatch(/'duplicate'/i);
    expect(rpc).toMatch(/UPDATE\s+public\.payments/i);
    expect(rpc).toMatch(/reconciled_at\s*=\s*now\(\)/i);
  });

  it('creates the payment when no pending payment exists', () => {
    expect(rpc).toMatch(/INSERT\s+INTO\s+public\.payments/i);
  });

  it('does NOT touch invoices (invoice lifecycle removed)', () => {
    const body = rpc.match(/CREATE OR REPLACE FUNCTION public\.reconcile_payment[\s\S]*?\$\$/);
    expect(body).not.toBeNull();
    expect(body![0]).not.toMatch(/public\.invoices/i);
  });

  it('is SECURITY DEFINER and granted only to service_role', () => {
    expect(rpc).toContain('SECURITY DEFINER');
    expect(rpc).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.reconcile_payment[^)]*\)\s*TO\s+service_role/i);
  });
});

describe('grant_waiver RPC removed (no invoice balances)', () => {
  const sql = readFileSync(join(migrationsDir, '20260731000001_drop_invoice_lifecycle.sql'), 'utf8');
  const oldSql = readFileSync(join(migrationsDir, '20260720000004_fix_payment_and_waiver.sql'), 'utf8');

  it('new migration no longer defines grant_waiver', () => {
    expect(sql).not.toMatch(/FUNCTION\s+public\.grant_waiver\s*\(/);
  });

  it('new migration drops the old grant_waiver function', () => {
    expect(sql).toMatch(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.grant_waiver/i);
  });

  it('old migration still defined it (regression anchor)', () => {
    expect(oldSql).toMatch(/FUNCTION\s+public\.grant_waiver\s*\(/);
  });
});

describe('set_tenant_context RPC', () => {
  const sql = readFileSync(join(migrationsDir, '20260720000004_fix_payment_and_waiver.sql'), 'utf8');

  it('sets app.tenant_id config', () => {
    expect(sql).toMatch(/FUNCTION\s+public\.set_tenant_context\s*\(/);
    expect(sql).toMatch(/set_config\('app\.tenant_id',\s*p_tenant_id::text,\s*false\)/i);
  });

  it('is granted to authenticated role', () => {
    expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.set_tenant_context\s*\(\s*uuid\s*\)\s*TO\s+authenticated/i);
  });
});

describe('guardians_link tenant isolation', () => {
  const sql = readFileSync(join(migrationsDir, '20260720000005_guardian_link_and_payroll.sql'), 'utf8');

  it('adds tenant_id column to guardians_link', () => {
    expect(sql).toMatch(/ADD\s+COLUMN\s+tenant_id\s+uuid/i);
  });

  it('creates compound UNIQUE on (student_id, parent_id, tenant_id)', () => {
    expect(sql).toMatch(/guardians_link_student_parent_tenant_key/i);
    expect(sql).toMatch(/UNIQUE\s*\(student_id,\s*parent_id,\s*tenant_id\)/i);
  });

  it('enforces same-tenant via trigger', () => {
    expect(sql).toMatch(/FUNCTION\s+public\.enforce_same_tenant_guardian/i);
    expect(sql).toMatch(/v_student_tenant\s*!=\s*v_parent_tenant/i);
  });

  it('auto-sets tenant_id on insert', () => {
    expect(sql).toMatch(/NEW\.tenant_id\s*:=\s*v_student_tenant/i);
  });
});

describe('payroll isolation', () => {
  const sql = readFileSync(join(migrationsDir, '20260720000005_guardian_link_and_payroll.sql'), 'utf8');

  it('creates UNIQUE index on (tenant_id, teacher_id, period_start, period_end)', () => {
    expect(sql).toMatch(/payroll_runs_teacher_period_idx/i);
    expect(sql).toMatch(/UNIQUE\s+INDEX\s+payroll_runs_teacher_period_idx/i);
    expect(sql).toMatch(/ON\s+public\.payroll_runs\s*\(tenant_id,\s*teacher_id,\s*period_start,\s*period_end\)/i);
  });

  it('filters out soft-deleted runs', () => {
    expect(sql).toMatch(/WHERE\s+deleted_at\s+IS\s+NULL/i);
  });
});

describe('aggregate_payroll_counts RPC (N+1 fix)', () => {
  const sql = readFileSync(join(migrationsDir, '20260720000005_guardian_link_and_payroll.sql'), 'utf8');

  it('returns TABLE(teacher_id uuid, occurrences_count bigint)', () => {
    expect(sql).toMatch(/FUNCTION\s+public\.aggregate_payroll_counts\s*\(/);
    expect(sql).toMatch(/TABLE\s*\(teacher_id\s+uuid,\s*occurrences_count\s+bigint\)/i);
  });

  it('filters by p_tenant_id', () => {
    expect(sql).toMatch(/WHERE\s+ta\.tenant_id\s*=\s*p_tenant_id/i);
  });

  it('only counts approved present/late records', () => {
    expect(sql).toMatch(/ta\.approval_status\s*=\s*'approved'/i);
    expect(sql).toMatch(/ta\.status\s+IN\s+\(?'present',\s*'late'/i);
  });

  it('scopes to date range', () => {
    expect(sql).toMatch(/so\.occurs_on\s*>=\s*p_period_start/i);
    expect(sql).toMatch(/so\.occurs_on\s*<=\s*p_period_end/i);
  });

  it('groups by teacher_id', () => {
    expect(sql).toMatch(/GROUP\s+BY\s+ta\.teacher_id/i);
  });

  it('is granted to service_role', () => {
    expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.aggregate_payroll_counts/i);
  });
});

describe('impersonation_tokens table', () => {
  const sql = readFileSync(join(migrationsDir, '20260720000006_impersonation_and_sms.sql'), 'utf8');

  it('creates impersonation_tokens table with proper columns', () => {
    expect(sql).toMatch(/TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.impersonation_tokens/i);
    expect(sql).toMatch(/tenant_id\s+uuid/i);
    expect(sql).toMatch(/impersonator_id\s+uuid\s+NOT\s+NULL/i);
    expect(sql).toMatch(/ip_address\s+text/i);
    expect(sql).toMatch(/expires_at\s+timestamptz/i);
    expect(sql).toMatch(/revoked_at\s+timestamptz/i);
  });

  it('has index on tenant_id', () => {
    expect(sql).toMatch(/INDEX\s+impersonation_tokens_tenant_idx\s+ON\s+public\.impersonation_tokens\s*\(tenant_id\)/i);
  });
});

describe('SMS dedup index', () => {
  const sql = readFileSync(join(migrationsDir, '20260720000006_impersonation_and_sms.sql'), 'utf8');

  it('creates UNIQUE index on (channel, external_id, related_type, related_id)', () => {
    expect(sql).toMatch(/notifications_channel_external_unique_idx/i);
    expect(sql).toMatch(/ON\s+public\.notifications\s*\(channel,\s*external_id,\s*related_type,\s*related_id\)/i);
    expect(sql).toMatch(/WHERE\s+channel\s*=\s*'sms'/i);
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

describe('cascade_tenant_deletes migration', () => {
  const sql = readFileSync(join(migrationsDir, '20260727000005_cascade_tenant_deletes.sql'), 'utf8');

  const childTables = ['students', 'teachers', 'parents', 'subjects', 'sessions', 'fee_types',
    'invoices', 'guardians_link', 'credentials', 'other_income', 'expenses'];

  for (const table of childTables) {
    it(`drops and recreates FK on ${table} with ON DELETE CASCADE`, () => {
      expect(sql).toMatch(
        new RegExp(`DROP CONSTRAINT IF EXISTS\\s+${table}_tenant_id_fkey`, 'i')
      );
      expect(sql).toMatch(
        new RegExp(`ADD CONSTRAINT\\s+${table}_tenant_id_fkey\\s+FOREIGN KEY\\s*\\(\\s*tenant_id\\s*\\)\\s*REFERENCES\\s+public\\.tenants\\(id\\)\\s+ON DELETE CASCADE`, 'i')
      );
    });
  }
});
