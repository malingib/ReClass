import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

describe('messages migration (20260722000006)', () => {
  const sql = readFileSync(join(migrationsDir, '20260722000006_create_messages.sql'), 'utf8');

  it('creates messages table', () => {
    expect(sql).toMatch(/CREATE TABLE.*messages/);
  });

  it('has tenant_id FK to tenants', () => {
    expect(sql).toMatch(/tenant_id.*REFERENCES\s+tenants\(id\)/i);
  });

  it('has sender_role with CHECK constraint', () => {
    expect(sql).toMatch(/sender_role.*CHECK\s*\(.*IN\s*\(/i);
  });

  it('has RLS enabled', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  it('has tenant isolation policy', () => {
    expect(sql).toMatch(/messages_tenant_isolation/i);
  });

  it('has participant access policy', () => {
    expect(sql).toMatch(/messages_participant_access/i);
  });

  it('has insert policy', () => {
    expect(sql).toMatch(/messages_insert_own/i);
  });

  it('has indexes on tenant_id + conversation_id', () => {
    expect(sql).toMatch(/idx_messages_conversation/i);
    expect(sql).toMatch(/idx_messages_sender/i);
    expect(sql).toMatch(/idx_messages_recipient/i);
  });

  it('defines the tenant helper before creating policies', () => {
    expect(sql.indexOf('CREATE OR REPLACE FUNCTION app.tenant_id()')).toBeGreaterThanOrEqual(0);
    expect(sql.indexOf('CREATE POLICY')).toBeGreaterThan(sql.indexOf('CREATE OR REPLACE FUNCTION app.tenant_id()'));
  });
});

describe('exams migration (20260722000007)', () => {
  const sql = readFileSync(join(migrationsDir, '20260722000007_create_exams.sql'), 'utf8');

  it('defines the tenant helper before creating policies', () => {
    expect(sql.indexOf('CREATE OR REPLACE FUNCTION app.tenant_id()')).toBeGreaterThanOrEqual(0);
    expect(sql.indexOf('CREATE POLICY')).toBeGreaterThan(sql.indexOf('CREATE OR REPLACE FUNCTION app.tenant_id()'));
  });
});

describe('tenant isolation coverage', () => {
  const policies = readFileSync(join(migrationsDir, '20260720000002_enable_rls_policies.sql'), 'utf8');
  const tenantTest = readFileSync(join(process.cwd(), 'supabase', 'tests', 'tenant_isolation.sql'), 'utf8');

  for (const table of ['students', 'teachers', 'parents', 'subjects', 'sessions']) {
    it(`enables tenant RLS for ${table}`, () => {
      expect(policies).toMatch(new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
      expect(policies).toMatch(new RegExp(`CREATE POLICY[\\s\\S]*?public\\.${table}[\\s\\S]*?tenant_id`, 'i'));
    });
  }

  it('includes a real-database cross-tenant denial test', () => {
    expect(tenantTest).toContain("set_config('app.tenant_id'");
    expect(tenantTest).toContain('tenant A can read tenant B students');
    expect(tenantTest).toContain('tenant B can read tenant A students');
  });
});

describe('user-scoped role lookup', () => {
  const sql = readFileSync(join(migrationsDir, '20260805000002_user_scoped_role_access.sql'), 'utf8');

  it('allows authenticated users to read only their own role rows', () => {
    expect(sql).toMatch(/CREATE POLICY\s+user_roles_self_read/i);
    expect(sql).toMatch(/FOR SELECT TO authenticated/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
  });
});

describe('transactional message append', () => {
  const sql = readFileSync(join(migrationsDir, '20260805000004_idempotent_message_append.sql'), 'utf8');

  it('has a tenant-scoped idempotency key', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS idempotency_key uuid/i);
    expect(sql).toMatch(/UNIQUE INDEX[\s\S]*messages_tenant_idempotency_idx/i);
  });

  it('validates both participants and deduplicates retries', () => {
    expect(sql).toMatch(/message_participant_not_found/i);
    expect(sql).toMatch(/message_sender_forbidden/i);
    expect(sql).toMatch(/ON CONFLICT\s*\(tenant_id, idempotency_key\) DO NOTHING/i);
  });
});

describe('transactional exam result replacement', () => {
  const sql = readFileSync(join(migrationsDir, '20260801000001_replace_exam_results_rpc.sql'), 'utf8');

  it('locks the exam and performs validation before replacement', () => {
    expect(sql).toMatch(/FOR UPDATE/i);
    expect(sql).toMatch(/score_out_of_range/i);
    expect(sql).toMatch(/duplicate_result/i);
    expect(sql).toMatch(/invalid_student/i);
    expect(sql).toMatch(/invalid_subject/i);
  });

  it('replaces results inside one database function transaction', () => {
    expect(sql).toMatch(/DELETE FROM public\.exam_results/i);
    expect(sql).toMatch(/INSERT INTO public\.exam_results/i);
    expect(sql).toMatch(/SECURITY DEFINER/i);
  });
});

describe('user-scoped module provisioning', () => {
  const sql = readFileSync(join(migrationsDir, '20260805000006_user_scoped_module_access.sql'), 'utf8');

  it('allows reads only for users with a role in the tenant', () => {
    expect(sql).toMatch(/CREATE POLICY\s+tenant_modules_member_read/i);
    expect(sql).toMatch(/FOR SELECT TO authenticated/i);
    expect(sql).toMatch(/ur\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/ur\.tenant_id\s*=\s*tenant_modules\.tenant_id/i);
  });
});

describe('transactional session conflict guard + bank-reference idempotency', () => {
  const sql = readFileSync(join(migrationsDir, '20260805000007_session_conflict_and_bank_idempotency.sql'), 'utf8');

  it('creates sessions inside one function with an in-transaction overlap guard', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.create_session_with_conflict/i);
    expect(sql).toMatch(/SECURITY DEFINER/i);
    expect(sql).toMatch(/session_conflict/i);
    expect(sql).toMatch(/session_fk_not_found/i);
  });

  it('validates subject/teacher within the same tenant', () => {
    expect(sql).toMatch(/FROM public\.subjects/i);
    expect(sql).toMatch(/FROM public\.teachers/i);
    expect(sql).toMatch(/tenant_id = p_tenant_id/i);
  });

  it('enforces a unique bank reference per tenant without destroying history', () => {
    expect(sql).toMatch(/UNIQUE INDEX.*payments_unique_bank_reference/i);
    expect(sql).toMatch(/tenant_id, bank_reference/i);
    expect(sql).toMatch(/SET status = 'reversed'/i); // dedupe marks, never deletes
    expect(sql).not.toMatch(/DELETE FROM public\.payments/i);
  });
});
