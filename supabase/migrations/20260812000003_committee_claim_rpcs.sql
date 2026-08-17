-- ==========================================================================
-- eShule RPC changes: chairman attendance approval + B2C claim (2026-08-12)
-- ==========================================================================
-- 1. review_teacher_attendance — allow the remedial committee CHAIRMAN (a
--    teacher wearing the chairman hat) to approve/reject attendance, alongside
--    the principal. Replaces hard-coding the principal role.
-- 2. claim_payroll_run — atomic approved→processing transition used by the B2C
--    edge function. Only an approved run may be claimed, exactly once.
-- ==========================================================================

-- ── 1. Chairman + principal may review attendance ─────────────────────────
CREATE OR REPLACE FUNCTION public.review_teacher_attendance(
  p_tenant_id uuid,
  p_profile_id uuid,
  p_attendance_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  updated_id uuid;
  is_principal boolean;
  is_chairman boolean;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('status', 'invalid_decision');
  END IF;
  IF p_decision = 'rejected' AND nullif(btrim(p_note), '') IS NULL THEN
    RETURN jsonb_build_object('status', 'note_required');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_profile_id AND tenant_id = p_tenant_id AND role IN ('principal', 'school_admin')
  ) INTO is_principal;

  SELECT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE tenant_id = p_tenant_id
      AND profile_id = p_profile_id
      AND remedial_role = 'chairman'
      AND deleted_at IS NULL
  ) INTO is_chairman;

  IF NOT (is_principal OR is_chairman) THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  UPDATE public.teacher_attendance SET
    approval_status = p_decision,
    reviewed_by = p_profile_id,
    reviewed_at = now(),
    review_note = nullif(btrim(p_note), '')
  WHERE id = p_attendance_id AND tenant_id = p_tenant_id
    AND approval_status = 'pending' AND deleted_at IS NULL
  RETURNING id INTO updated_id;

  RETURN jsonb_build_object(
    'status', CASE WHEN updated_id IS NULL THEN 'not_pending' ELSE p_decision END,
    'attendance_id', updated_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_teacher_attendance(uuid, uuid, uuid, text, text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_teacher_attendance(uuid, uuid, uuid, text, text)
  TO service_role;

-- ── 2. Claim a payroll run for B2C ─────────────────────────────────────────
-- Atomically moves an APPROVED run to PROCESSING (once), stamps processing_at,
-- and mints the idempotent b2c_checkout_id used as Daraja's originator
-- conversation id. Only the remedial TREASURER (or school_admin covering for
-- them) may claim. Returns the payout details the edge function needs.
CREATE OR REPLACE FUNCTION public.claim_payroll_run(
  p_tenant_id uuid,
  p_run_id uuid,
  p_profile_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_run public.payroll_runs;
  v_teacher public.teachers;
  v_checkout text;
  v_allowed boolean;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs
    WHERE id = p_run_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
    FOR UPDATE;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF v_run.status <> 'approved' THEN
    RETURN jsonb_build_object('status', v_run.status);
  END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.teachers
      WHERE tenant_id = p_tenant_id AND profile_id = p_profile_id
        AND remedial_role = 'treasurer' AND deleted_at IS NULL
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_profile_id AND tenant_id = p_tenant_id AND role = 'school_admin'
    )
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  SELECT * INTO v_teacher FROM public.teachers
    WHERE id = v_run.teacher_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;

  v_checkout := gen_random_uuid()::text;

  UPDATE public.payroll_runs SET
    status = 'processing',
    processing_at = now(),
    b2c_checkout_id = v_checkout
  WHERE id = p_run_id AND tenant_id = p_tenant_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_claimable');
  END IF;

  RETURN jsonb_build_object(
    'status', 'claimed',
    'run_id', v_run.id,
    'amount', v_run.amount,
    'teacher_id', v_run.teacher_id,
    'teacher_phone', v_teacher.phone,
    'teacher_id_number', v_teacher.id_number,
    'teacher_name', v_teacher.first_name || ' ' || v_teacher.last_name,
    'rate_per_session', v_run.rate_per_session,
    'occurrences_count', v_run.occurrences_count,
    'b2c_checkout_id', v_checkout
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payroll_run(uuid, uuid, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payroll_run(uuid, uuid, uuid)
  TO service_role;

-- ── 3. Finalize a B2C result ──────────────────────────────────────────────
-- Called by the b2c-result edge function. Idempotent: only transitions a
-- PROCESSING run to PAID (result_code 0) or FAILED (otherwise) exactly once.
-- A retried callback after 'paid' is a no-op (returns 'already_paid').
CREATE OR REPLACE FUNCTION public.finalize_payroll_b2c(
  p_tenant_id uuid,
  p_b2c_checkout_id text,
  p_result_code integer,
  p_result_desc text,
  p_receipt text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_run public.payroll_runs;
  v_status text;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs
    WHERE b2c_checkout_id = p_b2c_checkout_id
    FOR UPDATE;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_run.status = 'paid' THEN
    RETURN jsonb_build_object('status', 'already_paid');
  END IF;

  IF p_result_code = 0 THEN
    v_status := 'paid';
    UPDATE public.payroll_runs SET
      status = 'paid',
      b2c_status = 'success',
      paid_at = now(),
      mpesa_receipt = nullif(p_receipt, ''),
      last_error = NULL
    WHERE id = v_run.id;
  ELSE
    v_status := 'failed';
    UPDATE public.payroll_runs SET
      status = 'failed',
      b2c_status = 'failed',
      last_error = left(coalesce(p_result_desc, 'Daraja B2C failed'), 500)
    WHERE id = v_run.id;
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'run_id', v_run.id,
    'tenant_id', v_run.tenant_id,
    'teacher_id', v_run.teacher_id,
    'amount', v_run.amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_payroll_b2c(uuid, text, integer, text, text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payroll_b2c(uuid, text, integer, text, text)
  TO service_role;

-- ── 4. Set the single current term ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_current_term(
  p_tenant_id uuid,
  p_term_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.terms
    WHERE id = p_term_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  UPDATE public.terms SET is_current = false
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  UPDATE public.terms SET is_current = true
  WHERE id = p_term_id AND tenant_id = p_tenant_id;

  UPDATE public.tenants SET current_term_id = p_term_id WHERE id = p_tenant_id;

  RETURN jsonb_build_object('status', 'ok', 'term_id', p_term_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_current_term(uuid, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_term(uuid, uuid)
  TO service_role;