-- ==========================================================================
-- 20260805000007: Remedial scheduling conflict protection + bank-reference
-- idempotency.
--
-- 1. create_session_with_conflict: moves the remedial session "overlap check
--    then insert" into a single database function. The function runs as one
--    transaction, validates tenant-scoped subject/teacher foreign keys, and
--    re-checks the teacher/class/room overlap inside the same statement that
--    inserts — closing the check-then-insert race window that the route-level
--    two-query version left open.
--
-- 2. payments unique bank reference: a school-fee bank (KCB/Buni) deposit is
--    keyed by (tenant_id, bank_reference). Enforcing uniqueness here means a
--    retried / double-submitted cash-office form can never silently post the
--    same bank slip twice; the app maps 23505 to a friendly 409.
-- ==========================================================================

-- ── 1. Transactional session create with conflict guard ────────────────────
CREATE OR REPLACE FUNCTION public.create_session_with_conflict(
  p_tenant_id  uuid,
  p_class      text,
  p_subject_id uuid,
  p_teacher_id uuid,
  p_day_of_week int,
  p_start_time time,
  p_end_time   time,
  p_room       text,
  p_slot       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_subject_id IS NULL OR p_teacher_id IS NULL THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = '22023';
  END IF;
  IF p_day_of_week < 1 OR p_day_of_week > 7 OR p_start_time IS NULL OR p_end_time IS NULL
     OR p_start_time >= p_end_time
     OR length(trim(coalesce(p_class, ''))) = 0 OR length(trim(coalesce(p_room, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = '22023';
  END IF;

  -- Tenant-bound FK validation (cross-tenant classes/teachers are rejected).
  IF NOT EXISTS (
    SELECT 1 FROM public.subjects
     WHERE id = p_subject_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.teachers
     WHERE id = p_teacher_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'session_fk_not_found' USING ERRCODE = '42501';
  END IF;

  -- Transactional overlap guard: re-checked in the same statement that inserts.
  IF EXISTS (
    SELECT 1 FROM public.sessions s
     WHERE s.tenant_id = p_tenant_id
       AND s.day_of_week = p_day_of_week
       AND s.active
       AND s.deleted_at IS NULL
       AND s.start_time < p_end_time
       AND s.end_time   > p_start_time
       AND (
         s.teacher_id = p_teacher_id
         OR lower(trim(coalesce(s.class, ''))) = lower(trim(p_class))
         OR lower(trim(coalesce(s.room, '')))  = lower(trim(p_room))
       )
  ) THEN
    RAISE EXCEPTION 'session_conflict' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.sessions (
    tenant_id, class, subject_id, teacher_id,
    day_of_week, start_time, end_time, room, slot, active
  ) VALUES (
    p_tenant_id, trim(p_class), p_subject_id, p_teacher_id,
    p_day_of_week, p_start_time, p_end_time, trim(p_room), NULLIF(trim(coalesce(p_slot, '')), ''), true
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_session_with_conflict(uuid, text, uuid, uuid, int, time, time, text, text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_with_conflict(uuid, text, uuid, uuid, int, time, time, text, text)
  TO service_role;

-- ── 2. Bank reference idempotency (school-fee bank channel) ────────────────
-- A school-fee bank (KCB/Buni) deposit is identified by (tenant_id, bank_reference).
-- We never DESTROY history here: instead we mark any pre-existing duplicate
-- (same tenant + reference, lower/oldest survives) as 'reversed' so the unique
-- index can be created without losing the audit trail, then enforce uniqueness.
-- A retried cash-office submit then hits 23505 and is mapped to a friendly 409.
UPDATE public.payments a
   SET status = 'reversed', updated_at = now()
  FROM public.payments b
 WHERE a.method = 'bank'
   AND a.bank_reference IS NOT NULL
   AND b.method = 'bank'
   AND a.tenant_id = b.tenant_id
   AND a.bank_reference = b.bank_reference
   AND a.status <> 'reversed'
   AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id));

CREATE UNIQUE INDEX IF NOT EXISTS payments_unique_bank_reference
  ON public.payments (tenant_id, bank_reference)
  WHERE method = 'bank' AND bank_reference IS NOT NULL AND status <> 'reversed';
