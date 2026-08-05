-- ==========================================================================
-- Two-system domain separation
-- --------------------------------------------------------------------------
-- ReClass tracks TWO parallel financial systems on one platform:
--   1. School fees   -> set in Finance, paid via KCB/Buni BANK transfer
--   2. Remedial fees -> set in ReClass, paid via M-Pesa PAYBILL (STK push)
--
-- This migration introduces the data-layer discriminators that make that
-- separation real, plus the KCB bank-payment channel and per-teacher
-- remedial pay configuration.
--
-- All new columns are added nullable / with safe defaults so existing rows
-- and the application keep working; backfills follow.
-- ==========================================================================

-- 1. fee_types.domain  ('school' | 'remedial')
-- --------------------------------------------------------------------------
ALTER TABLE public.fee_types
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'school'
    CHECK (domain IN ('school', 'remedial'));

-- 2. invoices.domain  (mirrors the fee_type it was generated from)
-- --------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'school'
    CHECK (domain IN ('school', 'remedial'));

-- 3. payments.method  now includes bank (KCB/Buni)
-- --------------------------------------------------------------------------
-- Existing check only allowed 'mpesa'. Replace with a 3-value check.
DO $$
BEGIN
  -- drop the old single-value check if present
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.check_constraints cc
      ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'payments' AND ccu.column_name = 'method'
      AND cc.check_clause = '(method = ''mpesa''::text)'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_method_check;
  END IF;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('mpesa', 'bank'));

-- Bank-specific columns (KCB/Buni reference, depositor, posting date)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS bank_reference text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS deposited_by uuid REFERENCES public.profiles(id);

-- 4. tenants: KCB / Buni bank configuration for school-fee collection
-- --------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS kcb_account_no text,
  ADD COLUMN IF NOT EXISTS kcb_bank_name text DEFAULT 'KCB',
  ADD COLUMN IF NOT EXISTS buni_shortcode text;

-- 5. teachers: type + per-teacher remedial rate (overrides tenant default)
-- --------------------------------------------------------------------------
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS teacher_type text NOT NULL DEFAULT 'both'
    CHECK (teacher_type IN ('remedial', 'classroom', 'both')),
  ADD COLUMN IF NOT EXISTS remedial_rate_per_session numeric(10,2) DEFAULT 0;

-- 6. Backfill existing data (best effort)
-- --------------------------------------------------------------------------
-- Any fee_types/invoices already present are treated as school fees unless a
-- future migration explicitly re-tags remedial ones. This keeps Finance
-- reporting correct on first deploy.
UPDATE public.fee_types SET domain = 'school' WHERE domain IS NULL OR domain = '';
UPDATE public.invoices  SET domain = 'school' WHERE domain IS NULL OR domain = '';

-- 7. Indexes to keep domain-scoped reporting fast
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fee_types_domain      ON public.fee_types (tenant_id, domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_domain       ON public.invoices  (tenant_id, domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_method       ON public.payments  (tenant_id, method);
CREATE INDEX IF NOT EXISTS idx_teachers_type         ON public.teachers  (tenant_id, teacher_type) WHERE deleted_at IS NULL;
