-- ==========================================================================
-- eShule Payment Platform v2 (2026-08-02)
-- ==========================================================================
-- 1. tenants: per-domain payment channel (one per domain: bank OR mpesa).
-- 2. students.admission_no ≤ 12 chars (Safaricom AccountReference limit).
-- 3. reconcile_payment v3: stamps student_id / fee_type_id / domain in one shot.
--
-- NOTE: no remedial_enrollments table — ALL students attend remedials, so the
-- ReClass student ledger is derived directly from `students` + `payments`.
-- ==========================================================================

-- ── 1. Per-domain payment channels ─────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS school_payment_channel   TEXT NOT NULL DEFAULT 'bank'
    CHECK (school_payment_channel IN ('bank', 'mpesa')),
  ADD COLUMN IF NOT EXISTS remedial_payment_channel TEXT NOT NULL DEFAULT 'mpesa'
    CHECK (remedial_payment_channel IN ('bank', 'mpesa'));

-- ── 2. Admission number ≤ 12 chars (Safaricom AccountReference) ────────────
-- Live data verified ≤ 12 chars, so a plain CHECK is safe to apply.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_admission_no_maxlen'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_admission_no_maxlen
      CHECK (char_length(admission_no) <= 12);
  END IF;
END $$;

-- ── 2b. Unmatched manual deposits (can't attribute a tenant yet) ───────────
-- Raw M-Pesa callback payloads that could not be routed (unknown admission
-- number). Admin/bursar matches them to a student from the queue; matching
-- creates a real `payments` row and stamps this row's matched_at.
CREATE TABLE IF NOT EXISTS public.unmatched_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES public.tenants(id),          -- best-effort, may be NULL
  checkout_id      TEXT NOT NULL UNIQUE,
  mpesa_receipt    TEXT,
  amount           NUMERIC(12,2) NOT NULL,
  phone            TEXT,
  bill_ref         TEXT,
  matched_to       UUID REFERENCES public.payments(id),
  matched_by       UUID REFERENCES public.profiles(id),
  matched_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unmatched_payments_open
  ON public.unmatched_payments (matched_at) WHERE matched_at IS NULL;

ALTER TABLE public.unmatched_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.unmatched_payments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP TRIGGER IF EXISTS trg_unmatched_payments_updated ON public.unmatched_payments;
CREATE TRIGGER trg_unmatched_payments_updated BEFORE UPDATE ON public.unmatched_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 3. reconcile_payment v3 ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.reconcile_payment(text, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.reconcile_payment(text, numeric, text, uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.reconcile_payment(
  p_checkout_id text,
  p_amount numeric,
  p_phone text,
  p_tenant_id uuid,
  p_student_id uuid DEFAULT NULL,
  p_fee_type_id uuid DEFAULT NULL,
  p_domain text DEFAULT 'remedial'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'invalid_amount');
  END IF;

  -- Idempotent: a payment with this checkout_id already exists?
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE mpesa_checkout_id = p_checkout_id
    AND tenant_id = p_tenant_id;

  IF FOUND THEN
    UPDATE public.payments
      SET status = 'paid', reconciled_at = now(),
          student_id = COALESCE(student_id, p_student_id),
          fee_type_id = COALESCE(fee_type_id, p_fee_type_id),
          domain = COALESCE(domain, p_domain)
      WHERE id = v_payment_id;
    RETURN jsonb_build_object('status', 'duplicate', 'payment_id', v_payment_id);
  END IF;

  -- No pending payment recorded yet (callback beat the app write, or a manual
  -- paybill deposit with no checkout row): create the receipt directly from the
  -- callback payload, stamping the student resolved by admission number.
  INSERT INTO public.payments (
    tenant_id, amount, phone, method, mpesa_checkout_id, status, reconciled_at,
    student_id, fee_type_id, domain
  ) VALUES (
    p_tenant_id, p_amount, p_phone, 'mpesa', p_checkout_id, 'paid', now(),
    p_student_id, p_fee_type_id, p_domain
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('status', 'completed', 'payment_id', v_payment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_payment(text, numeric, text, uuid, uuid, uuid, text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, numeric, text, uuid, uuid, uuid, text)
  TO service_role;
