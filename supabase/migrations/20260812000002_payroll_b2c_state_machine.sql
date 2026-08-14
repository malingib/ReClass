-- ==========================================================================
-- eShule payroll: B2C payout state machine + idempotency (2026-08-12)
-- ==========================================================================
-- Payroll runs now track a full payment lifecycle so the dashboard can show
-- pending / processing / paid / failed with an auditable paper trail:
--
--   draft ──(approve, chairman)──▶ approved ──(pay request, treasurer)──▶ processing
--   processing ──(B2C accepted)──▶ processing (awaiting result)
--   processing ──(B2C queue result)──▶ paid  |  failed
--
-- Idempotency: a run may only ever reference ONE Daraja originator request.
-- `b2c_checkout_id` is globally unique so a retried B2C callback cannot
-- double-pay. `status='paid'` implies `paid_at` is set.
-- ==========================================================================

ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_status_check;

ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_status_check
    CHECK (status IN ('draft', 'approved', 'pending', 'processing', 'paid', 'failed'));

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS b2c_checkout_id  TEXT,
  ADD COLUMN IF NOT EXISTS b2c_status        TEXT,
  ADD COLUMN IF NOT EXISTS last_error        TEXT,
  ADD COLUMN IF NOT EXISTS processing_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mpesa_receipt     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_runs_b2c_checkout_unique
  ON public.payroll_runs (b2c_checkout_id)
  WHERE b2c_checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status_tenant
  ON public.payroll_runs (tenant_id, status)
  WHERE deleted_at IS NULL;

-- status='paid' must always carry paid_at.
ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_paid_paid_at_check;

ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_paid_paid_at_check
    CHECK (status <> 'paid' OR paid_at IS NOT NULL);

-- A run reaches processing exactly once: once B2C is initiated, later attempts
-- must be ignored (the web UI polls status rather than re-submitting).
ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_once_processing;

ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_once_processing
    CHECK (
      status <> 'processing'
      OR (b2c_checkout_id IS NOT NULL AND processing_at IS NOT NULL)
    );