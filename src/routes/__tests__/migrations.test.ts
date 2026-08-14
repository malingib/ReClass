import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

// NOTE: this project is single-tenant and uses the service-role client
// (bypasses RLS) for all server queries. The RLS policies in migrations are
// retained only as documentation/defense-in-depth — they are NOT enforced at
// runtime. Tests therefore assert migration *structure*, not cross-tenant
// isolation behavior (that would be testing inert policy). See
// src/lib/supabase/server.ts for the security rationale.

describe('messages migration (20260722000006)', () => {
  const sql = readFileSync(join(migrationsDir, '20260722000006_create_messages.sql'), 'utf8');

  it('creates messages table', () => {
    expect(sql).toMatch(/CREATE TABLE.*messages/);
  });

  it('has sender_role with CHECK constraint', () => {
    expect(sql).toMatch(/sender_role.*CHECK\s*\(.*IN\s*\(/i);
  });

  it('has indexes on tenant_id + conversation_id', () => {
    expect(sql).toMatch(/idx_messages_conversation/i);
    expect(sql).toMatch(/idx_messages_sender/i);
    expect(sql).toMatch(/idx_messages_recipient/i);
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
