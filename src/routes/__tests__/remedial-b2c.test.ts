import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const migration1 = readFileSync(join(migrationsDir, '20260812000001_remedial_committee_terms_b2c.sql'), 'utf8');
const migration2 = readFileSync(join(migrationsDir, '20260812000002_payroll_b2c_state_machine.sql'), 'utf8');
const migration3 = readFileSync(join(migrationsDir, '20260812000003_committee_claim_rpcs.sql'), 'utf8');
const migration4 = readFileSync(join(migrationsDir, '20260812000004_remedial_sms_triggers.sql'), 'utf8');
const b2c = readFileSync(join(process.cwd(), 'supabase', 'functions', 'b2c', 'index.ts'), 'utf8');
const b2cResult = readFileSync(join(process.cwd(), 'supabase', 'functions', 'b2c-result', 'index.ts'), 'utf8');

describe('remedial committee + terms migration', () => {
  it('creates the canonical terms table with tenant isolation', () => {
    expect(migration1).toMatch(/CREATE TABLE IF NOT EXISTS public\.terms/);
    expect(migration1).toMatch(/tenant_id\s+UUID NOT NULL REFERENCES public\.tenants\(id\) ON DELETE CASCADE/);
    expect(migration1).toMatch(/UNIQUE \(tenant_id, name\)/);
    expect(migration1).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration1).toMatch(/tenant_isolation ON public\.terms/);
  });

  it('adds current_term_id to tenants with FK to terms', () => {
    expect(migration1).toMatch(/ADD COLUMN IF NOT EXISTS current_term_id UUID REFERENCES public\.terms\(id\) ON DELETE SET NULL/);
  });

  it('adds teachers remedial_role hat and payout identity', () => {
    expect(migration1).toMatch(/remedial_role TEXT NOT NULL DEFAULT 'none'/);
    expect(migration1).toMatch(/CHECK \(remedial_role IN \('chairman', 'treasurer', 'member', 'none'\)\)/);
    expect(migration1).toMatch(/ADD COLUMN IF NOT EXISTS phone TEXT/);
    expect(migration1).toMatch(/ADD COLUMN IF NOT EXISTS id_number TEXT/);
  });
});

describe('payroll B2C state machine migration', () => {
  it('expands payroll_runs status to the full B2C lifecycle', () => {
    expect(migration2).toMatch(/'draft', 'approved', 'pending', 'processing', 'paid', 'failed'/);
  });

  it('adds B2C tracking columns', () => {
    expect(migration2).toMatch(/b2c_checkout_id\s+TEXT/);
    expect(migration2).toMatch(/b2c_status\s+TEXT/);
    expect(migration2).toMatch(/last_error\s+TEXT/);
    expect(migration2).toMatch(/processing_at\s+TIMESTAMPTZ/);
    expect(migration2).toMatch(/mpesa_receipt\s+TEXT/);
  });

  it('enforces idempotency on the checkout id', () => {
    expect(migration2).toMatch(/payroll_runs_b2c_checkout_unique/);
    expect(migration2).toMatch(/WHERE b2c_checkout_id IS NOT NULL/);
  });
});

describe('committee claim RPCs migration', () => {
  it('allows chairman to review attendance alongside principal', () => {
    expect(migration3).toMatch(/CREATE OR REPLACE FUNCTION public\.review_teacher_attendance/);
    expect(migration3).toMatch(/remedial_role\s*=\s*'chairman'/);
  });

  it('defines claim_payroll_run with atomic approved→processing claim', () => {
    expect(migration3).toMatch(/CREATE OR REPLACE FUNCTION public\.claim_payroll_run/);
    expect(migration3).toMatch(/FOR UPDATE/);
    expect(migration3).toMatch(/FOR UPDATE/);
    expect(migration3).toMatch(/treasurer|school_admin/);
  });

  it('defines finalize_payroll_b2c as idempotent terminal transition', () => {
    expect(migration3).toMatch(/CREATE OR REPLACE FUNCTION public\.finalize_payroll_b2c/);
    expect(migration3).toMatch(/already_paid/);
  });

  it('defines set_current_term to atomically flip the current term', () => {
    expect(migration3).toMatch(/CREATE OR REPLACE FUNCTION public\.set_current_term/);
    expect(migration3).toMatch(/UPDATE public\.terms SET is_current = false/);
    expect(migration3).toMatch(/UPDATE public\.tenants SET current_term_id/);
  });

  it('grants EXECUTE only to service_role', () => {
    expect(migration3).toMatch(/REVOKE ALL ON FUNCTION/);
    expect(migration3).toMatch(/GRANT EXECUTE ON FUNCTION public\.set_current_term[\s\S]*TO service_role/);
  });
});

describe('remedial SMS triggers migration', () => {
  it('queues an SMS on session allocation', () => {
    expect(migration4).toMatch(/FUNCTION public\.notify_session_allocation/);
    expect(migration4).toMatch(/TRIGGER trg_notify_session_allocation[\s\S]*ON public\.sessions/);
    expect(migration4).toMatch(/channel\s*=\s*'sms'/);
  });

  it('schedules session reminders and payment reminders cron jobs', () => {
    expect(migration4).toMatch(/reclass-session-reminders/);
    expect(migration4).toMatch(/reclass-payment-reminders/);
    expect(migration4).toMatch(/cron\.schedule/);
  });

  it('dedupes reminders via external_id', () => {
    expect(migration4).toMatch(/external_id/);
    expect(migration4).toMatch(/session-reminder:/);
    expect(migration4).toMatch(/payment-reminder:/);
  });
});

describe('B2C edge functions contract', () => {
  it('b2c pre-flights before hitting Daraja and claims the run', () => {
    expect(b2c).toContain("rpc('claim_payroll_run'");
    expect(b2c).toMatch(/SHORTCODE_REQUIRED|CREDS_NOT_FOUND|CREDS_INVALID|B2C_CREEDS_REQUIRED|TEACHER_PHONE_REQUIRED|TEACHER_ID_REQUIRED|INVALID_AMOUNT/);
    expect(b2c).toContain('/mpesa/b2c/v1/paymentrequest');
    expect(b2c).toContain('BusinessPayment');
  });

  it('b2c-result fails closed on the callback secret and finalizes idempotently', () => {
    expect(b2cResult).toMatch(/MPESA_CALLBACK_SECRET/);
    expect(b2cResult).toMatch(/finalize_payroll_b2c/);
    expect(b2cResult).toContain("rpc('finalize_payroll_b2c'");
  });

  it('guards the payout request behind the service role key', () => {
    expect(b2c).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
