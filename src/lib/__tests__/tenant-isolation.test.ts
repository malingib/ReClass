import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isRole, roleRoutes, roleLabels, type Role } from '$lib/auth';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

describe('reconcile_payment (v2 — fix_payment_and_waiver)', () => {
  const rpc = readFileSync(join(migrationsDir, '20260720000004_fix_payment_and_waiver.sql'), 'utf8');

  it('accepts 5 arguments including p_tenant_id', () => {
    expect(rpc).toMatch(/FUNCTION\s+public\.reconcile_payment\s*\(/);
    expect(rpc).toMatch(/p_tenant_id\s+uuid/);
  });

  it('scopes invoice lookup by p_tenant_id', () => {
    expect(rpc).toMatch(/WHERE\s+id\s*=\s*p_invoice_id\s+AND\s+tenant_id\s*=\s*p_tenant_id/i);
  });

  it('locks the invoice row with FOR UPDATE', () => {
    expect(rpc).toMatch(/FOR\s+UPDATE/i);
  });

  it('detects duplicate checkout_id', () => {
    expect(rpc).toMatch(/mpesa_checkout_id\s*=\s*p_checkout_id/i);
    expect(rpc).toMatch(/'duplicate'/i);
  });

  it('records overpayment to payment_reconciliations', () => {
    expect(rpc).toMatch(/v_overpayment\s*>\s*0/i);
    expect(rpc).toMatch(/INSERT\s+INTO\s+public\.payment_reconciliations/i);
    expect(rpc).toMatch(/excess_amount/i);
  });

  it('returns partial_overpayment when amount exceeds balance', () => {
    expect(rpc).toMatch(/'partial_overpayment'/i);
    expect(rpc).toMatch(/'excess'/i);
    expect(rpc).toMatch(/'reconciliation_id'/i);
  });

  it('does NOT manually UPDATE invoices.amount_paid', () => {
    const reconcileBody = rpc.match(/CREATE OR REPLACE FUNCTION public\.reconcile_payment[\s\S]*?\$\$/);
    expect(reconcileBody).not.toBeNull();
    expect(reconcileBody![0]).not.toMatch(/UPDATE\s+public\.invoices/i);
  });

  it('is SECURITY DEFINER and granted only to service_role', () => {
    expect(rpc).toContain('SECURITY DEFINER');
    expect(rpc).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.reconcile_payment[^)]*\)\s*TO\s+service_role/i);
  });

  it('rejects non-positive amounts', () => {
    expect(rpc).toMatch(/IF\s+p_amount\s*<=\s*0/i);
    expect(rpc).toMatch(/'invalid_amount'/i);
  });
});

describe('grant_waiver RPC (atomic waiver)', () => {
  const rpc = readFileSync(join(migrationsDir, '20260720000004_fix_payment_and_waiver.sql'), 'utf8');

  it('exists as a function with 5 params', () => {
    expect(rpc).toMatch(/FUNCTION\s+public\.grant_waiver\s*\(/);
    expect(rpc).toMatch(/p_invoice_id\s+uuid/);
    expect(rpc).toMatch(/p_tenant_id\s+uuid/);
  });

  it('locks invoice row with FOR UPDATE', () => {
    expect(rpc).toMatch(/FOR\s+UPDATE/i);
  });

  it('rejects already-settled invoices', () => {
    expect(rpc).toMatch(/IF\s+v_invoice\.status\s+IN\s+\(?\s*'paid'\s*,/i);
    expect(rpc).toMatch(/'already_settled'/i);
  });

  it('validates waiver does not exceed outstanding balance', () => {
    expect(rpc).toMatch(/p_amount\s*>\s*v_outstanding/i);
    expect(rpc).toMatch(/'exceeds_balance'/i);
  });

  it('writes audit_log with before/after', () => {
    expect(rpc).toMatch(/INSERT\s+INTO\s+public\.audit_log/i);
    expect(rpc).toMatch(/waiver_granted/i);
    expect(rpc).toMatch(/jsonb_build_object\('invoice_id',\s*p_invoice_id, 'amount_paid',\s*v_invoice\.amount_paid/i);
  });

  it('transitions invoice status to waived when fully paid', () => {
    expect(rpc).toMatch(/CASE WHEN\s+v_new_paid\s*>=\s*v_invoice\.amount_due\s+THEN\s+'waived'/i);
  });

  it('is granted to service_role', () => {
    expect(rpc).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.grant_waiver/i);
  });

  it('rejects non-positive amounts', () => {
    expect(rpc).toMatch(/IF\s+p_amount\s*<=\s*0/i);
    expect(rpc).toMatch(/'invalid_amount'/i);
    expect(rpc).toMatch(/Waiver amount must be positive/i);
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
