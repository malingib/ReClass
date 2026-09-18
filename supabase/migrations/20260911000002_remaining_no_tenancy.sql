-- Remaining tenancy removal (companion to ..._remove_tenancy and
-- ..._functions_no_tenancy). Covers everything with no live caller plus two
-- live-called fixes: mark_own_teacher_attendance (Teacher UI calls it without
-- p_tenant_id) and v_teacher_attendance_daily (dashboard reads it).
-- Out of scope (inert, documented): set_tenant_context / app.tenant_id GUC
-- helpers, RLS policies (disabled), reclass governance tables.
-- All statements idempotent; safe to re-run.

-- ── 0. messages.tenant_id (append_message writes it) ────────────────────
DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'tenant_id') THEN
    EXECUTE 'ALTER TABLE public.messages DROP COLUMN tenant_id';
  END IF;
  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_idempotency ON public.messages (idempotency_key)';
  END IF;
END $$;

-- ── 1. Teacher self-marking (LIVE caller: Teacher UI, no tenant param) ───
DROP FUNCTION IF EXISTS public.mark_own_teacher_attendance(uuid, uuid, uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.mark_own_teacher_attendance(p_teacher_id uuid, p_profile_id uuid, p_occurrence_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assigned uuid; od date; aid uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_profile_id THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF p_status NOT IN ('attended', 'absent') THEN RETURN jsonb_build_object('status', 'invalid_status'); END IF;
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = p_teacher_id AND profile_id = p_profile_id AND deleted_at IS NULL) THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  SELECT COALESCE(o.teacher_id, s.teacher_id), o.occurs_on INTO assigned, od FROM session_occurrences o JOIN sessions s ON s.id = o.session_id WHERE o.id = p_occurrence_id AND o.status <> 'cancelled' AND s.deleted_at IS NULL AND s.active = true;
  IF assigned IS DISTINCT FROM p_teacher_id THEN RETURN jsonb_build_object('status', 'not_assigned'); END IF;
  IF od > current_date THEN RETURN jsonb_build_object('status', 'future_occurrence'); END IF;
  INSERT INTO teacher_attendance(occurrence_id, teacher_id, status, marked_by, marked_at, approval_status, deleted_at)
  VALUES (p_occurrence_id, p_teacher_id, p_status, p_profile_id, now(), 'pending', NULL)
  ON CONFLICT (occurrence_id, teacher_id) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, marked_at = now(), approval_status = 'pending', reviewed_by = NULL, reviewed_at = NULL, review_note = NULL, deleted_at = NULL WHERE teacher_attendance.approval_status <> 'approved'
  RETURNING id INTO aid;
  IF aid IS NULL THEN RETURN jsonb_build_object('status', 'already_approved'); END IF;
  UPDATE session_occurrences SET status = 'done', updated_at = now() WHERE id = p_occurrence_id;
  RETURN jsonb_build_object('status', 'pending', 'attendance_id', aid);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_own_teacher_attendance(uuid, uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_own_teacher_attendance(uuid, uuid, uuid, text) TO authenticated;

-- ── 2. PayBill governance status (body already tenant-free; drop param) ──
DROP FUNCTION IF EXISTS public.remedial_paybill_governance_status(uuid);
CREATE OR REPLACE FUNCTION public.remedial_paybill_governance_status()
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
WITH ops AS (SELECT DISTINCT COALESCE(role_assignment_id::text, committee_member_id::text) holder FROM remedial_paybill_operators WHERE active AND (effective_from IS NULL OR effective_from <= now()) AND (effective_to IS NULL OR effective_to >= now())),
initiators AS (SELECT DISTINCT COALESCE(role_assignment_id::text, committee_member_id::text) holder FROM remedial_paybill_operators WHERE active AND (effective_from IS NULL OR effective_from <= now()) AND (effective_to IS NULL OR effective_to >= now()) AND operator_role IN ('initiator', 'manager')),
approvers AS (SELECT DISTINCT COALESCE(role_assignment_id::text, committee_member_id::text) holder FROM remedial_paybill_operators WHERE active AND (effective_from IS NULL OR effective_from <= now()) AND (effective_to IS NULL OR effective_to >= now()) AND operator_role IN ('approver', 'manager')),
levels AS (SELECT COUNT(DISTINCT approval_level) configured_levels FROM remedial_paybill_operators WHERE active AND (effective_from IS NULL OR effective_from <= now()) AND (effective_to IS NULL OR effective_to >= now()) AND operator_role = 'approver' AND approval_level IS NOT NULL),
settings AS (SELECT * FROM remedial_paybill_settings LIMIT 1)
SELECT jsonb_build_object('operator_count', (SELECT count(*) FROM ops), 'initiator_count', (SELECT count(*) FROM initiators), 'approver_count', (SELECT count(*) FROM approvers), 'approval_levels_configured', COALESCE((SELECT configured_levels FROM levels), 0), 'minimum_web_operators', COALESCE((SELECT minimum_web_operators FROM settings), 2), 'required_approval_levels', COALESCE((SELECT approval_levels FROM settings), 1), 'maker_checker_required', COALESCE((SELECT maker_checker_required FROM settings), true), 'initiator_may_approve_own_transaction', COALESCE((SELECT initiator_may_approve_own_transaction FROM settings), false), 'ready', ((SELECT count(*) FROM ops) >= COALESCE((SELECT minimum_web_operators FROM settings), 2) AND (SELECT count(*) FROM initiators) >= 1 AND (SELECT count(*) FROM approvers) >= 1 AND COALESCE((SELECT configured_levels FROM levels), 0) >= COALESCE((SELECT approval_levels FROM settings), 1)))
$$;
REVOKE ALL ON FUNCTION public.remedial_paybill_governance_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.remedial_paybill_governance_status() TO authenticated;

-- ── 3. Views without tenancy ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_teacher_attendance_daily AS
SELECT so.occurs_on::date AS day,
  count(*) FILTER (WHERE ta.status = 'attended') AS attended,
  count(*) FILTER (WHERE ta.status = 'absent') AS absent,
  count(*) AS total
FROM public.teacher_attendance ta JOIN public.session_occurrences so ON so.id = ta.occurrence_id
WHERE ta.deleted_at IS NULL GROUP BY so.occurs_on::date;

CREATE OR REPLACE VIEW public.v_payroll_weekly AS
SELECT period_start, period_end, count(*) AS teacher_count,
  sum(amount) AS payroll_total,
  count(*) FILTER (WHERE status = 'paid') AS paid_teachers,
  count(*) FILTER (WHERE status = 'teacher_confirmed') AS confirmed_teachers
FROM public.payroll_runs WHERE deleted_at IS NULL GROUP BY period_start, period_end;

CREATE OR REPLACE VIEW public.v_teacher_payment_breakdown AS
SELECT l.payroll_id, l.teacher_id, d.name, d.category, l.quantity, l.unit_amount, l.amount
FROM public.teacher_payment_lines l JOIN public.teacher_payment_definitions d ON d.id = l.definition_id;

CREATE OR REPLACE VIEW public.sis_stats_view AS
SELECT
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COUNT(DISTINCT se.id) AS total_sessions,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_classes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days') AS recent_admissions,
  COUNT(DISTINCT e.id) AS total_enrollments
FROM public.students s
LEFT JOIN public.teachers t ON t.deleted_at IS NULL
LEFT JOIN public.sessions se ON se.active = true
LEFT JOIN public.sis_classes c ON true
LEFT JOIN public.sis_admissions a ON true
LEFT JOIN public.sis_enrollments e ON true
WHERE s.deleted_at IS NULL;

CREATE OR REPLACE VIEW reclass.invoice_details AS
SELECT
  i.id,
  i.student_id,
  i.amount_due,
  i.amount_paid,
  i.status,
  i.due_date,
  i.created_at,
  i.fee_type_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  s.grade
FROM public.invoices i
LEFT JOIN public.students s ON s.id = i.student_id
WHERE i.deleted_at IS NULL;

CREATE OR REPLACE VIEW reclass.payment_details AS
SELECT
  p.id           AS payment_id,
  p.amount,
  p.phone,
  p.method,
  p.status       AS payment_status,
  p.created_at   AS paid_at,
  NULL::numeric  AS amount_due,
  NULL::numeric  AS invoice_amount_paid,
  NULL::text     AS invoice_status,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  s.grade
FROM public.payments p
LEFT JOIN public.students s ON s.id = p.student_id;

CREATE OR REPLACE VIEW reclass.attendance_details AS
SELECT
  ta.id,
  ta.occurrence_id,
  ta.teacher_id,
  ta.status        AS attendance_status,
  ta.approval_status,
  ta.marked_at,
  ta.reviewed_at,
  so.occurs_on,
  so.session_id,
  ses.class,
  ses.subject_id,
  sub.name         AS subject_name,
  t.first_name || ' ' || t.last_name AS teacher_name,
  t.employee_no
FROM public.teacher_attendance ta
JOIN public.session_occurrences so ON so.id = ta.occurrence_id
JOIN public.sessions ses           ON ses.id = so.session_id
LEFT JOIN public.subjects sub      ON sub.id = ses.subject_id
JOIN public.teachers t             ON t.id = ta.teacher_id
WHERE ta.deleted_at IS NULL;

CREATE OR REPLACE VIEW reclass.student_profile AS
SELECT
  st.id,
  st.admission_no,
  st.first_name,
  st.last_name,
  st.first_name || ' ' || st.last_name AS full_name,
  st.grade,
  st.status          AS enrollment_status,
  st.created_at,
  COALESCE(se.class_id, sc.id) AS class_id,
  COALESCE(sc.name, st.grade)  AS class_name,
  sc.stream
FROM public.students st
LEFT JOIN public.sis_enrollments se ON se.student_id = st.id AND se.status = 'active'
LEFT JOIN public.sis_classes sc     ON sc.id = COALESCE(se.class_id, NULL)
WHERE st.deleted_at IS NULL;

CREATE OR REPLACE VIEW reclass.guardian_link AS
SELECT
  gl.parent_id,
  gl.student_id,
  p.full_name       AS parent_name,
  p.phone           AS parent_phone,
  p.email           AS parent_email,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  s.grade
FROM public.guardians_link gl
JOIN public.parents p    ON p.id = gl.parent_id
JOIN public.students s   ON s.id = gl.student_id;

COMMENT ON SCHEMA reclass IS 'Cross-domain views for dashboards and reporting (single-school, no tenancy)';

-- Guarded: payroll_components domain never shipped on pilot projects.
DO $mig$ BEGIN
  IF to_regclass('public.payroll_components') IS NOT NULL AND to_regclass('public.payroll_component_payments') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE VIEW public.payroll_run_component_summary AS
SELECT
  pr.id AS payroll_run_id,
  pr.teacher_id,
  pc.component_type,
  pc.role_code,
  pc.role_label,
  SUM(pc.amount) AS component_total
FROM public.payroll_runs pr
JOIN public.payroll_components pc
  ON pc.payroll_run_id = pr.id
 AND pc.deleted_at IS NULL
GROUP BY pr.id, pr.teacher_id, pc.component_type, pc.role_code, pc.role_label;
$fn$;
    EXECUTE $fn$
CREATE OR REPLACE VIEW public.payroll_component_payment_summary AS
SELECT
  pc.payroll_run_id,
  pc.id AS payroll_component_id,
  pc.component_type,
  pc.role_code,
  pc.role_label,
  pc.description,
  pc.amount AS component_amount,
  COALESCE(SUM(pp.amount), 0) AS paid_amount,
  pc.amount - COALESCE(SUM(pp.amount), 0) AS outstanding_amount
FROM public.payroll_components pc
LEFT JOIN public.payroll_component_payments pp
  ON pp.payroll_component_id = pc.id
WHERE pc.deleted_at IS NULL
GROUP BY pc.payroll_run_id, pc.id, pc.component_type, pc.role_code, pc.role_label, pc.description, pc.amount;
$fn$;
  END IF;
END $mig$;

-- ── 4. Remaining RPCs ────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.replace_exam_results(uuid, uuid, uuid, jsonb);
-- Guarded: exams domain never shipped on pilot projects.
DO $mig$ BEGIN
  IF to_regclass('public.exams') IS NOT NULL AND to_regclass('public.exam_results') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.replace_exam_results(
  p_exam_id uuid,
  p_actor_id uuid,
  p_entries jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_entry_count int;
BEGIN
  IF p_exam_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'missing_required_argument' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'entries_must_be_array' USING ERRCODE = '22023';
  END IF;

  v_entry_count := jsonb_array_length(p_entries);
  IF v_entry_count > 1000 THEN
    RAISE EXCEPTION 'too_many_entries' USING ERRCODE = '54000';
  END IF;

  SELECT *
    INTO v_exam
    FROM public.exams
   WHERE id = p_exam_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = p_actor_id
       AND role IN ('school_admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE tmp_exam_results (
    student_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    score numeric(5,2) NOT NULL,
    grade text,
    remarks text
  ) ON COMMIT DROP;

  INSERT INTO tmp_exam_results (student_id, subject_id, score, grade, remarks)
  SELECT
    (entry->>'student_id')::uuid,
    (entry->>'subject_id')::uuid,
    (entry->>'score')::numeric,
    NULLIF(left(coalesce(entry->>'grade', ''), 20), ''),
    NULLIF(left(coalesce(entry->>'remarks', ''), 500), '')
  FROM jsonb_array_elements(p_entries) AS entry;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results
     WHERE score < 0 OR score > v_exam.max_score
  ) THEN
    RAISE EXCEPTION 'score_out_of_range' USING ERRCODE = '22003';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results
     GROUP BY student_id, subject_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_result' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results r
      LEFT JOIN public.students s
        ON s.id = r.student_id
       AND s.deleted_at IS NULL
     WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_student' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results r
      LEFT JOIN public.subjects s
        ON s.id = r.subject_id
       AND s.deleted_at IS NULL
     WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_subject' USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.exam_results
   WHERE exam_id = p_exam_id;

  INSERT INTO public.exam_results (
    exam_id, student_id, subject_id, score, grade, remarks, created_by
  )
  SELECT
    p_exam_id, student_id, subject_id, score, grade, remarks, p_actor_id
  FROM tmp_exam_results;
END;
$body$;
$fn$;
  END IF;
END $mig$;

DROP FUNCTION IF EXISTS public.create_session_with_conflict(uuid, text, uuid, uuid, int, time, time, text, text);
CREATE OR REPLACE FUNCTION public.create_session_with_conflict(
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
  IF p_subject_id IS NULL OR p_teacher_id IS NULL THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = '22023';
  END IF;
  IF p_day_of_week < 1 OR p_day_of_week > 7 OR p_start_time IS NULL OR p_end_time IS NULL
     OR p_start_time >= p_end_time
     OR length(trim(coalesce(p_class, ''))) = 0 OR length(trim(coalesce(p_room, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subjects
     WHERE id = p_subject_id AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.teachers
     WHERE id = p_teacher_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'session_fk_not_found' USING ERRCODE = '42501';
  END IF;

  -- Overlap guard: re-checked in the same statement that inserts.
  IF EXISTS (
    SELECT 1 FROM public.sessions s
     WHERE s.day_of_week = p_day_of_week
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
    class, subject_id, teacher_id,
    day_of_week, start_time, end_time, room, slot, active
  ) VALUES (
    trim(p_class), p_subject_id, p_teacher_id,
    p_day_of_week, p_start_time, p_end_time, trim(p_room), NULLIF(trim(coalesce(p_slot, '')), ''), true
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_session_with_conflict(text, uuid, uuid, int, time, time, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_with_conflict(text, uuid, uuid, int, time, time, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.append_message(uuid, uuid, uuid, uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.append_message(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid,
  p_body text,
  p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_message_id uuid;
BEGIN
  IF p_conversation_id IS NULL OR p_sender_id IS NULL
     OR p_recipient_id IS NULL OR p_idempotency_key IS NULL
     OR length(trim(coalesce(p_body, ''))) = 0 OR length(p_body) > 5000 THEN
    RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_sender_id AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_recipient_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'message_participant_not_found' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = p_sender_id
       AND role IN ('parent', 'teacher', 'school_admin')
  ) THEN
    RAISE EXCEPTION 'message_sender_forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_id, sender_role, recipient_id, body, idempotency_key
  )
  SELECT p_conversation_id, p_sender_id,
         ur.role, p_recipient_id, trim(p_body), p_idempotency_key
    FROM public.user_roles ur
   WHERE ur.user_id = p_sender_id
     AND ur.role IN ('parent', 'teacher', 'school_admin')
   ORDER BY CASE ur.role WHEN 'school_admin' THEN 1 WHEN 'teacher' THEN 2 ELSE 3 END
   LIMIT 1
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT id INTO v_message_id
      FROM public.messages
     WHERE idempotency_key = p_idempotency_key;
  END IF;

  RETURN v_message_id;
END;
$$;

DROP FUNCTION IF EXISTS public.grant_waiver(uuid, numeric, text, uuid, uuid);
CREATE OR REPLACE FUNCTION public.grant_waiver(
  p_invoice_id uuid,
  p_amount numeric,
  p_reason text,
  p_granted_by uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_waiver_id uuid;
  v_new_paid numeric;
  v_new_status text;
  v_outstanding numeric;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'invalid_amount', 'message', 'Waiver amount must be positive');
  END IF;

  -- Lock the invoice row to prevent concurrent payment callbacks
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'message', 'Invoice not found');
  END IF;

  IF v_invoice.status IN ('paid', 'waived') THEN
    RETURN jsonb_build_object('status', 'already_settled', 'message', format('Invoice is already %s', v_invoice.status));
  END IF;

  v_outstanding := v_invoice.amount_due - coalesce(v_invoice.amount_paid, 0);
  IF p_amount > v_outstanding THEN
    RETURN jsonb_build_object('status', 'exceeds_balance', 'message', 'Waiver exceeds outstanding balance');
  END IF;

  INSERT INTO public.waivers (invoice_id, amount, reason, granted_by)
  VALUES (p_invoice_id, p_amount, p_reason, p_granted_by)
  RETURNING id INTO v_waiver_id;

  v_new_paid := coalesce(v_invoice.amount_paid, 0) + p_amount;
  UPDATE public.invoices
  SET amount_paid = v_new_paid,
      status = CASE WHEN v_new_paid >= v_invoice.amount_due THEN 'waived' ELSE v_invoice.status END
  WHERE id = p_invoice_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, "before", "after")
  VALUES (p_granted_by, 'waiver_granted', 'waivers', v_waiver_id,
    jsonb_build_object('invoice_id', p_invoice_id, 'amount_paid', v_invoice.amount_paid, 'status', v_invoice.status),
    jsonb_build_object('invoice_id', p_invoice_id, 'amount_paid', v_new_paid, 'waiver_amount', p_amount, 'reason', p_reason));

  RETURN jsonb_build_object('status', 'completed', 'waiver_id', v_waiver_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_waiver(uuid, numeric, text, uuid) TO service_role;

DROP FUNCTION IF EXISTS public.set_current_term(uuid, uuid);
CREATE OR REPLACE FUNCTION public.set_current_term(p_term_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.terms
    WHERE id = p_term_id AND deleted_at IS NULL
  ) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  UPDATE public.terms SET is_current = false
  WHERE deleted_at IS NULL;

  UPDATE public.terms SET is_current = true
  WHERE id = p_term_id;

  RETURN jsonb_build_object('status', 'ok', 'term_id', p_term_id);
END;
$$;

DROP FUNCTION IF EXISTS public.get_dashboard_counts(uuid, date, date);
CREATE OR REPLACE FUNCTION public.get_dashboard_counts(
  p_since_date DATE,
  p_today_date DATE
)
RETURNS TABLE (
    total_students_count BIGINT,
    total_teachers_count BIGINT,
    total_sessions_count BIGINT,
    due_occurrences_count BIGINT,
    delivered_attendance_count BIGINT,
    pending_attendance_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH student_counts AS (
        SELECT COUNT(*)::BIGINT AS total_students_count FROM students WHERE deleted_at IS NULL
    ),
    teacher_counts AS (
        SELECT COUNT(*)::BIGINT AS total_teachers_count FROM teachers WHERE deleted_at IS NULL
    ),
    session_counts AS (
        SELECT COUNT(*)::BIGINT AS total_sessions_count FROM sessions WHERE active = true
    ),
    due_occurrences AS (
        SELECT COUNT(*)::BIGINT AS count FROM session_occurrences WHERE occurs_on BETWEEN p_since_date AND p_today_date AND status != 'cancelled'
    ),
    delivered_attendance AS (
        SELECT COUNT(*)::BIGINT AS count
        FROM teacher_attendance ta
        JOIN session_occurrences so ON ta.occurrence_id = so.id
        WHERE ta.approval_status = 'approved' AND ta.status IN ('present', 'late') AND so.occurs_on BETWEEN p_since_date AND p_today_date
    ),
    pending_attendance AS (
        SELECT COUNT(*)::BIGINT AS count FROM teacher_attendance WHERE approval_status = 'pending' AND deleted_at IS NULL
    )
    SELECT
        COALESCE((SELECT total_students_count FROM student_counts), 0),
        COALESCE((SELECT total_teachers_count FROM teacher_counts), 0),
        COALESCE((SELECT total_sessions_count FROM session_counts), 0),
        COALESCE((SELECT count FROM due_occurrences), 0),
        COALESCE((SELECT count FROM delivered_attendance), 0),
        COALESCE((SELECT count FROM pending_attendance), 0)
    FROM student_counts
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.get_attendance_overview(uuid, date, date);
CREATE OR REPLACE FUNCTION public.get_attendance_overview(
  p_since_date DATE,
  p_today_date DATE
)
RETURNS TABLE (attendance_data JSONB, trend_data JSONB) AS $$
BEGIN
    RETURN QUERY
    WITH daily_attendance AS (
        SELECT
            so.occurs_on::DATE,
            COUNT(CASE WHEN ta.status = 'present' THEN 1 END) AS present_count,
            COUNT(CASE WHEN ta.status = 'late' THEN 1 END) AS late_count,
            COUNT(CASE WHEN ta.status = 'absent' THEN 1 END) AS absent_count,
            COUNT(*) AS total_count
        FROM session_occurrences so
        LEFT JOIN teacher_attendance ta ON so.id = ta.occurrence_id
            AND ta.approval_status = 'approved'
        WHERE so.occurs_on BETWEEN p_since_date AND p_today_date
          AND so.status != 'cancelled'
        GROUP BY so.occurs_on::DATE
        ORDER BY so.occurs_on::DATE
    )
    SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
            'date', occurs_on::TEXT,
            'present', present_count,
            'late', late_count,
            'absent', absent_count,
            'total', total_count,
            'rate', CASE WHEN total_count > 0 THEN ROUND((present_count + late_count) * 100.0 / total_count, 1) ELSE 0 END
        )), '[]') AS attendance_data,
        COALESCE(jsonb_build_object(
            'overall_rate', ROUND(SUM(present_count + late_count) * 100.0 / NULLIF(SUM(total_count), 0), 1),
            'total_sessions', SUM(total_count),
            'completed_sessions', SUM(present_count + late_count)
        ), '{}') AS trend_data
    FROM daily_attendance;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  since timestamptz := now() - interval '14 days';
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM public.students WHERE deleted_at IS NULL),
    'teachers', (SELECT count(*) FROM public.teachers WHERE deleted_at IS NULL),
    'subjects', (SELECT count(*) FROM public.subjects WHERE deleted_at IS NULL),
    'groups', (SELECT count(*) FROM public.sessions WHERE deleted_at IS NULL),
    'unpaid', (SELECT count(*) FROM public.invoices WHERE status = 'unpaid' AND deleted_at IS NULL),
    'paidInvoices', (SELECT count(*) FROM public.invoices WHERE status = 'paid' AND deleted_at IS NULL),
    'unpaidAmount', (SELECT COALESCE(SUM(amount_due - COALESCE(amount_paid, 0)), 0) FROM public.invoices WHERE status = 'unpaid' AND deleted_at IS NULL),
    'attendanceRate', (
      SELECT CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE status IN ('present','late')))::numeric / count(*) * 100)
        ELSE 0 END
      FROM public.teacher_attendance
      WHERE marked_at >= since AND deleted_at IS NULL
    ),
    'sessionsCount', (SELECT count(*) FROM public.session_occurrences WHERE occurs_on >= since::date),
    'recentStudents', (
      SELECT jsonb_agg(jsonb_build_object('id', id, 'admission_no', admission_no, 'first_name', first_name, 'last_name', last_name, 'grade', grade, 'created_at', created_at) ORDER BY created_at DESC)
      FROM (SELECT * FROM public.students WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5) s
    ),
    'recentInvoices', (
      SELECT jsonb_agg(jsonb_build_object('id', i.id, 'amount_due', i.amount_due, 'amount_paid', i.amount_paid, 'status', i.status, 'due_date', i.due_date, 'created_at', i.created_at, 'parent_name', 'Parent', 'student_name', s.first_name || ' ' || s.last_name, 'admission_no', s.admission_no) ORDER BY i.created_at DESC)
      FROM (SELECT * FROM public.invoices WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5) i
      LEFT JOIN public.students s ON s.id = i.student_id
    ),
    'trend', (
      SELECT jsonb_agg(jsonb_build_object('label', to_char(d::date, 'Mon DD'), 'value', CASE WHEN cnt > 0 THEN round(present::numeric / cnt * 100) ELSE 0 END) ORDER BY d)
      FROM (
        SELECT d::date AS d, count(ta.id) AS cnt, count(*) FILTER (WHERE ta.status IN ('present','late')) AS present
        FROM generate_series(date_trunc('day', since), date_trunc('day', now()), '1 day'::interval) d
        LEFT JOIN public.teacher_attendance ta ON date_trunc('day', ta.marked_at) = d::date AND ta.deleted_at IS NULL
        GROUP BY d::date
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS public.add_payroll_component(uuid, text, text, numeric, numeric, numeric, text, text, text, uuid, jsonb);
-- Guarded: payroll_components domain never shipped on pilot projects.
DO $mig$ BEGIN
  IF to_regclass('public.payroll_components') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.add_payroll_component(
  p_payroll_run_id uuid,
  p_component_type text,
  p_description text,
  p_quantity numeric,
  p_rate numeric,
  p_amount numeric,
  p_role_code text DEFAULT NULL,
  p_role_label text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.payroll_components
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_run public.payroll_runs;
  v_component public.payroll_components;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','school_admin','principal','bursar')
  ) THEN
    RAISE EXCEPTION 'Not authorized to manage payroll';
  END IF;

  SELECT * INTO v_run
  FROM public.payroll_runs
  WHERE id = p_payroll_run_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll run not found'; END IF;
  IF v_run.status NOT IN ('draft','pending') THEN RAISE EXCEPTION 'Payroll run is not editable'; END IF;
  IF p_component_type IN ('committee','role_specific') AND (p_role_code IS NULL OR p_role_label IS NULL) THEN RAISE EXCEPTION 'Role is required for this payment type'; END IF;
  IF p_amount <> round(p_quantity * p_rate, 2) THEN RAISE EXCEPTION 'Amount must equal quantity multiplied by rate'; END IF;

  INSERT INTO public.payroll_components (payroll_run_id,teacher_id,component_type,description,quantity,rate,amount,role_code,role_label,source_type,source_id,metadata,created_by)
  VALUES (v_run.id,v_run.teacher_id,p_component_type,p_description,p_quantity,p_rate,p_amount,p_role_code,p_role_label,p_source_type,p_source_id,p_metadata,auth.uid())
  RETURNING * INTO v_component;
  RETURN v_component;
END;
$body$;
$fn$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.add_payroll_component(uuid,text,text,numeric,numeric,numeric,text,text,text,uuid,jsonb) FROM public, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.add_payroll_component(uuid,text,text,numeric,numeric,numeric,text,text,text,uuid,jsonb) TO authenticated, service_role';
  END IF;
END $mig$;

DROP FUNCTION IF EXISTS public.validate_remedial_paybill_operator(uuid, uuid, text, smallint);
CREATE OR REPLACE FUNCTION public.validate_remedial_paybill_operator(
  p_committee_member_id uuid,
  p_operator_role text,
  p_approval_level smallint DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  member_active boolean;
  configured_levels smallint;
BEGIN
  SELECT active INTO member_active
  FROM public.remedial_committee_members
  WHERE id = p_committee_member_id;

  IF member_active IS NULL OR NOT member_active THEN
    RAISE EXCEPTION 'Committee member is not active in this school';
  END IF;

  SELECT approval_levels INTO configured_levels
  FROM public.remedial_paybill_settings
  LIMIT 1;
  IF configured_levels IS NULL THEN
    SELECT approval_levels INTO configured_levels
    FROM public.remedial_paybill_settings
    LIMIT 1;
  END IF;

  IF p_operator_role = 'approver' AND (p_approval_level IS NULL OR p_approval_level > COALESCE(configured_levels, 1)) THEN
    RAISE EXCEPTION 'Approver level is outside the configured PayBill approval workflow';
  END IF;
  IF p_operator_role <> 'approver' AND p_approval_level IS NOT NULL THEN RAISE EXCEPTION 'Only approvers may have an approval level'; END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.validate_reclass_committee_role_assignment(uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.validate_reclass_committee_role_assignment(
  p_role_id uuid,
  p_teacher_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.remedial_committee_role_definitions
    WHERE id = p_role_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Committee role is not active in this school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_teacher_id AND role = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Only users with the teacher role can be assigned to the remedial committee';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.validate_reclass_paybill_role_operator(uuid, uuid, text, smallint);
CREATE OR REPLACE FUNCTION public.validate_reclass_paybill_role_operator(
  p_role_assignment_id uuid,
  p_operator_role text,
  p_approval_level smallint DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE configured_levels smallint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.remedial_committee_role_assignments a
    JOIN public.remedial_committee_role_definitions r ON r.id = a.role_id
    JOIN public.user_roles ur ON ur.user_id = a.teacher_id AND ur.role = 'teacher'
    WHERE a.id = p_role_assignment_id AND a.active = true AND r.active = true
  ) THEN RAISE EXCEPTION 'Committee role assignment is not active or the assignee is not a teacher'; END IF;

  SELECT approval_levels INTO configured_levels FROM public.remedial_paybill_settings LIMIT 1;
  IF p_operator_role = 'approver' AND (p_approval_level IS NULL OR p_approval_level > COALESCE(configured_levels, 1)) THEN
    RAISE EXCEPTION 'Approver level is outside the configured PayBill approval workflow';
  END IF;
  IF p_operator_role <> 'approver' AND p_approval_level IS NOT NULL THEN RAISE EXCEPTION 'Only approvers may have an approval level'; END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.approve_teacher_attendance(uuid, text, text);
CREATE OR REPLACE FUNCTION public.approve_teacher_attendance(p_attendance_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS public.teacher_attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.teacher_attendance; ok boolean;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid attendance decision'; END IF;
  SELECT * INTO a FROM public.teacher_attendance WHERE id = p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attendance record not found'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.remedial_committee_role_assignments ra JOIN public.remedial_committee_rights rr ON rr.assignment_id = ra.id WHERE ra.teacher_id = auth.uid() AND ra.active AND rr.right_code = 'approve_attendance' AND rr.granted) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Only an authorized ReClass committee member may approve attendance'; END IF;
  IF a.marked_by = auth.uid() THEN RAISE EXCEPTION 'A teacher cannot approve their own attendance'; END IF;
  UPDATE public.teacher_attendance SET approval_status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note WHERE id = a.id RETURNING * INTO a;
  INSERT INTO public.audit_logs(actor_user_id, action, module, entity_type, entity_id, target_user_id, source, result, metadata) VALUES (auth.uid(), 'teacher_attendance_' || p_decision, 'reclass', 'teacher_attendance', a.id, a.teacher_id, 'web', 'success', jsonb_build_object('status', a.status, 'note', p_note));
  RETURN a;
END;
$$;

-- Drop the tenant-scoped user lookup (callers: disabled RLS policies only).
DROP FUNCTION IF EXISTS public.tenant_ids_for_user();
