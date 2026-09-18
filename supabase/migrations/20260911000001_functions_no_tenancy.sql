-- Functions + triggers without tenancy (companion to 20260911000000_remove_tenancy).
--
-- The column drops in ..._remove_tenancy break every routine that reads or
-- writes tenant_id. This migration redefines exactly the routines on the
-- money/SMS path used by the edge functions (notify, sms-campaign,
-- credentials-test, stk, mpesa-callback, b2c, b2c-result, payroll-ops) and
-- the triggers that fire on their writes, plus replacement uniqueness that
-- the functions rely on for idempotency.
-- Out of scope (documented, untouched): exam/session/committee/append-message
-- RPCs, dashboard RPCs, reclass.* views, RLS policies, set_tenant_context.

-- ── 0. Extra tenant_id columns used only by the routines below ──────────
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'audit_log', 'credentials', 'guardians_link', 'checkout_requests',
    'session_occurrences', 'teacher_tasks', 'teachers', 'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN tenant_id', t);
    END IF;
  END LOOP;
END $$;

-- ── 1. Replacement uniqueness (guarded; never fail the migration) ───────
DO $$ BEGIN
  IF to_regclass('public.payroll_runs') IS NOT NULL THEN
    BEGIN EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_teacher_period_domain ON public.payroll_runs (teacher_id, period_start, period_end, domain) WHERE deleted_at IS NULL';
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip payroll_runs unique: %', SQLERRM; END;
  END IF;
  IF to_regclass('public.checkout_requests') IS NOT NULL THEN
    BEGIN EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_pending_student_fee ON public.checkout_requests (student_id, fee_type_id) WHERE status = ''pending'' AND student_id IS NOT NULL AND fee_type_id IS NOT NULL';
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip checkout_requests unique: %', SQLERRM; END;
  END IF;
  IF to_regclass('public.credentials') IS NOT NULL THEN
    BEGIN EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_credentials_provider_env_scope ON public.credentials (provider, environment, scope)';
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip credentials unique: %', SQLERRM; END;
  END IF;
  IF to_regclass('public.notifications') IS NOT NULL THEN
    BEGIN EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_external_id ON public.notifications (external_id) WHERE external_id IS NOT NULL';
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip notifications unique: %', SQLERRM; END;
  END IF;
  IF to_regclass('public.students') IS NOT NULL THEN
    BEGIN EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_students_admission_no ON public.students (admission_no)';
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip students unique: %', SQLERRM; END;
  END IF;
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_user_role ON public.user_roles (user_id, role)';
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip user_roles unique: %', SQLERRM; END;
  END IF;
END $$;

-- ── 2. Credential RPCs without tenancy ───────────────────────────────────
DROP FUNCTION IF EXISTS public.resolve_credential(uuid, text, boolean);
CREATE OR REPLACE FUNCTION public.resolve_credential(p_provider text, p_allow_sandbox boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.credentials
   WHERE provider = p_provider AND purpose = 'school_send'
     AND is_active = true
     ORDER BY CASE WHEN environment = 'production' THEN 0 ELSE 1 END
     LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF (SELECT environment FROM public.credentials WHERE id = v_id) = 'sandbox' AND p_allow_sandbox = false THEN
    RETURN NULL;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_credential(text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_credential(text, boolean) TO service_role;

DROP FUNCTION IF EXISTS public.decrypt_tenant_credential(uuid, uuid);
CREATE OR REPLACE FUNCTION public.decrypt_credential(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_blob text;
  v_kek text;
BEGIN
  SELECT encrypted_blob INTO v_blob
    FROM public.credentials
   WHERE id = p_id
     AND purpose = 'school_send'
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credential_not_found' USING ERRCODE = '42501';
  END IF;

  SELECT decrypted_secret INTO v_kek
    FROM vault.decrypted_secrets
   WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN
    RAISE EXCEPTION 'kek_missing' USING ERRCODE = '55000';
  END IF;

  RETURN pgp_sym_decrypt(v_blob::bytea, v_kek)::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.decrypt_credential(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credential(uuid) TO service_role;

-- ── 3. School settings toggle (replaces tenant_setting_enabled) ──────────
DROP FUNCTION IF EXISTS public.tenant_setting_enabled(uuid, text);
CREATE OR REPLACE FUNCTION public.school_setting_enabled(p_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_enabled boolean;
BEGIN
  SELECT (settings ->> p_key)::boolean INTO v_enabled FROM public.school_settings LIMIT 1;
  RETURN coalesce(v_enabled, true);
END;
$$;
REVOKE ALL ON FUNCTION public.school_setting_enabled(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_setting_enabled(text) TO service_role;

-- ── 4. claim_notifications without tenant_id ─────────────────────────────
-- (Return type changes, so the old version must be dropped first.)
DROP FUNCTION IF EXISTS public.claim_notifications(integer);
CREATE OR REPLACE FUNCTION public.claim_notifications(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  channel text,
  recipient text,
  body text,
  attempts integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT n.id
      FROM public.notifications n
     WHERE n.attempts < 3
       AND (
         (n.status = 'queued' AND (n.next_retry_at IS NULL OR n.next_retry_at <= now()))
         OR (n.status = 'processing' AND n.claimed_at < now() - interval '5 minutes')
       )
     ORDER BY n.created_at
     FOR UPDATE SKIP LOCKED
     LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
  ), claimed AS (
    UPDATE public.notifications n
       SET status = 'processing', claimed_at = now()
      FROM candidates c
     WHERE n.id = c.id
     RETURNING n.id, n.channel, n.recipient, n.body, n.attempts
  )
  SELECT c.id, c.channel, c.recipient, c.body, c.attempts
    FROM claimed c
   ORDER BY c.id;
END;
$$;

-- ── 5. reconcile_payment without tenancy ─────────────────────────────────
-- (The phase_2y body already ignores its tenant param; this drops the param.)
DROP FUNCTION IF EXISTS public.reconcile_payment(text, numeric, text, uuid, uuid, uuid, text);
CREATE FUNCTION public.reconcile_payment(p_checkout_id text, p_amount numeric, p_phone text, p_student_id uuid, p_fee_type_id uuid, p_domain text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid; old_status text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('status', 'invalid_amount'); END IF;
  IF nullif(btrim(p_checkout_id), '') IS NULL THEN RETURN jsonb_build_object('status', 'invalid_checkout_id'); END IF;
  SELECT id, status INTO pid, old_status FROM payments WHERE mpesa_checkout_id = p_checkout_id FOR UPDATE;
  IF FOUND THEN
    IF old_status = 'paid' THEN RETURN jsonb_build_object('status', 'duplicate', 'payment_id', pid); END IF;
    UPDATE payments SET status = 'paid', reconciled_at = now(),
      student_id = coalesce(student_id, p_student_id), fee_type_id = coalesce(fee_type_id, p_fee_type_id),
      domain = coalesce(domain, p_domain), updated_at = now() WHERE id = pid;
    RETURN jsonb_build_object('status', 'completed', 'payment_id', pid);
  END IF;
  INSERT INTO payments(amount, phone, method, mpesa_checkout_id, status, reconciled_at, student_id, fee_type_id, domain)
  VALUES (p_amount, p_phone, 'mpesa', p_checkout_id, 'paid', now(), p_student_id, p_fee_type_id, p_domain)
  RETURNING id INTO pid;
  RETURN jsonb_build_object('status', 'completed', 'payment_id', pid);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_payment(text, numeric, text, uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, numeric, text, uuid, uuid, text) TO service_role;

-- ── 6. Payroll RPCs without tenancy ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_payroll_run(uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_payroll_run(
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
    WHERE id = p_run_id AND deleted_at IS NULL
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
      WHERE profile_id = p_profile_id
        AND remedial_role = 'treasurer' AND deleted_at IS NULL
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_profile_id AND role = 'school_admin'
    )
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  SELECT * INTO v_teacher FROM public.teachers
    WHERE id = v_run.teacher_id AND deleted_at IS NULL;

  v_checkout := gen_random_uuid()::text;

  UPDATE public.payroll_runs SET
    status = 'processing',
    processing_at = now(),
    b2c_checkout_id = v_checkout
  WHERE id = p_run_id AND status = 'approved';

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
REVOKE ALL ON FUNCTION public.claim_payroll_run(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payroll_run(uuid, uuid) TO service_role;

DROP FUNCTION IF EXISTS public.finalize_payroll_b2c(uuid, text, integer, text, text);
CREATE OR REPLACE FUNCTION public.finalize_payroll_b2c(
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
    'teacher_id', v_run.teacher_id,
    'amount', v_run.amount
  );
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_payroll_b2c(text, integer, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payroll_b2c(text, integer, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.aggregate_payroll_counts(uuid, date, date);
CREATE OR REPLACE FUNCTION public.aggregate_payroll_counts(
  p_period_start date,
  p_period_end date
)
RETURNS TABLE(teacher_id uuid, occurrences_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT ta.teacher_id, count(*)::bigint
    FROM public.teacher_attendance ta
    JOIN public.session_occurrences so ON ta.occurrence_id = so.id
    WHERE ta.approval_status = 'approved'
      AND ta.deleted_at IS NULL
      AND ta.status IN ('present', 'late')
      AND so.occurs_on >= p_period_start
      AND so.occurs_on <= p_period_end
    GROUP BY ta.teacher_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.aggregate_payroll_counts(date, date) TO service_role;

-- ── 7. Triggers on the money/SMS path ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.notifications (
      channel, recipient, body, status, related_type, related_id, created_at
    ) VALUES (
      'inapp',
      NEW.phone,
      'Payment of KES ' || NEW.amount || ' received successfully.',
      'queued',
      'payment',
      NEW.id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    actor_id, action, entity, entity_id, before, after, created_at
  ) VALUES (
    NULLIF(current_setting('app.user_id', true), '')::uuid,
    CASE WHEN TG_OP = 'INSERT' THEN 'payment.created' ELSE 'payment.updated' END,
    'payment',
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_payroll_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.amount IS DISTINCT FROM NEW.amount THEN
    INSERT INTO public.audit_log (actor_id, action, entity, entity_id, before, after, created_at)
    VALUES (
      NULLIF(current_setting('app.user_id', true), '')::uuid,
      CASE WHEN TG_OP = 'INSERT' THEN 'payroll.created' ELSE 'payroll.updated' END,
      'payroll_run', NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW), now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_attendance_marked()
RETURNS trigger AS $$
DECLARE
  v_principal record;
  v_toggle boolean;
BEGIN
  SELECT (settings ->> 'sms_attendance')::boolean
    INTO v_toggle FROM public.school_settings LIMIT 1;
  IF NOT coalesce(v_toggle, true) THEN
    RETURN NEW;
  END IF;

  FOR v_principal IN
    SELECT ur.user_id
      FROM public.user_roles ur
     WHERE ur.role = 'principal'
  LOOP
    INSERT INTO public.notifications
      (channel, recipient_user_id, priority, body, status,
       related_type, related_id)
    VALUES (
      'inapp', v_principal.user_id, 'high',
      CASE
        WHEN NEW.status = 'absent' THEN 'A teacher was marked absent for a remedial session.'
        WHEN NEW.status = 'late' THEN 'A teacher was marked late for a remedial session.'
        ELSE 'Teacher attendance marked as ' || NEW.status || '.'
      END,
      'queued',
      'teacher_attendance',
      NEW.id
    );

    INSERT INTO public.notifications
      (channel, recipient, body, status, related_type, related_id)
    SELECT
      'sms', p.phone,
      format('eShule: A teacher was marked %s for a remedial session.',
        CASE WHEN NEW.status = 'absent' THEN 'absent' WHEN NEW.status = 'late' THEN 'late' ELSE NEW.status END),
      'queued', 'teacher_attendance', NEW.id
      FROM public.profiles p
     WHERE p.id = v_principal.user_id
       AND p.phone IS NOT NULL;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_unmatched_deposit()
RETURNS trigger AS $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN
    SELECT ur.user_id
      FROM public.user_roles ur
     WHERE ur.role IN ('bursar', 'school_admin')
  LOOP
    INSERT INTO public.notifications
      (channel, recipient_user_id, priority, body, status,
       related_type, related_id, external_id)
    VALUES (
      'inapp', v_user.user_id, 'high',
      format('A manual M-Pesa deposit of KES %s (ref %s) could not be matched automatically. Review the unmatched payments queue.',
        NEW.amount, COALESCE(NULLIF(btrim(NEW.bill_ref), ''), NULLIF(NEW.mpesa_receipt, ''), NEW.checkout_id)),
      'queued', 'unmatched_payment', NEW.id,
      'unmatched:' || NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_session_allocation()
RETURNS trigger AS $$
DECLARE
  v_phone text;
  v_toggle boolean;
BEGIN
  IF NEW.teacher_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.phone INTO v_phone
    FROM public.teachers t
   WHERE t.id = NEW.teacher_id AND t.deleted_at IS NULL;
  IF v_phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT (settings ->> 'sms_attendance')::boolean
    INTO v_toggle FROM public.school_settings LIMIT 1;
  IF NOT coalesce(v_toggle, true) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (channel, body, status, related_type, related_id, recipient)
  VALUES (
    'sms',
    format('eShule: You have been assigned a remedial %s (%s to %s). Mark your attendance at class time.',
      COALESCE(NEW.class, 'class'), to_char(NEW.start_time, 'HH24:MI'), to_char(NEW.end_time, 'HH24:MI')),
    'queued', 'session', NEW.id, v_phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enqueue_session_reminders()
RETURNS integer AS $$
DECLARE
  v_inserted integer := 0;
  row record;
  v_phone text;
  v_toggle boolean;
BEGIN
  FOR row IN
    SELECT so.id, so.teacher_id, so.occurs_on, so.start_time, s.class AS class_name
      FROM public.session_occurrences so
      JOIN public.sessions s ON s.id = so.session_id
     WHERE so.status = 'scheduled'
       AND so.occurs_on = current_date
       AND so.start_time BETWEEN
             (current_time - interval '2 hours') AND (current_time + interval '2 hours')
       AND so.teacher_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.external_id = 'session-reminder:' || so.id
       )
    LIMIT 200
  LOOP
    SELECT t.phone INTO v_phone FROM public.teachers t
      WHERE t.id = row.teacher_id AND t.deleted_at IS NULL;
    CONTINUE WHEN v_phone IS NULL;

    SELECT (settings ->> 'sms_attendance')::boolean
      INTO v_toggle FROM public.school_settings LIMIT 1;
    CONTINUE WHEN NOT coalesce(v_toggle, true);

    INSERT INTO public.notifications
      (channel, recipient, body, status, related_type, related_id, external_id)
    VALUES (
      'sms', v_phone,
      format('eShule: Remedial %s starts at %s today. Mark your delivery when the session begins.',
        COALESCE(row.class_name, 'class'), to_char(row.start_time, 'HH24:MI')),
      'queued', 'session_occurrence', row.id,
      'session-reminder:' || row.id
    )
    ON CONFLICT DO NOTHING;
    v_inserted := v_inserted + 1;
  END LOOP;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enqueue_payment_reminders()
RETURNS integer AS $$
DECLARE
  v_inserted integer := 0;
  v_parent record;
  v_toggle boolean;
  v_app_url text;
  v_school_name text;
  v_lines text[];
  v_line text;
  v_more integer;
BEGIN
  BEGIN
    v_app_url := coalesce(public.get_platform_config() ->> 'app_url', 'https://app.eshule.co.ke');
  EXCEPTION WHEN OTHERS THEN
    v_app_url := 'https://app.eshule.co.ke';
  END;
  SELECT name INTO v_school_name FROM public.school_settings LIMIT 1;

  FOR v_parent IN
    SELECT p.id AS parent_id, p.phone, p.full_name AS parent_name
      FROM public.parents p
     WHERE p.deleted_at IS NULL
       AND p.phone IS NOT NULL
       AND p.sms_consent = true
       AND EXISTS (
         SELECT 1 FROM public.guardians_link gl
         JOIN public.students s ON s.id = gl.student_id
          WHERE gl.parent_id = p.id
            AND s.status = 'active' AND s.deleted_at IS NULL
       )
     LIMIT 200
  LOOP
    SELECT (settings ->> 'sms_payment_reminder')::boolean
      INTO v_toggle FROM public.school_settings LIMIT 1;
    CONTINUE WHEN NOT coalesce(v_toggle, true);

    v_lines := ARRAY(
      SELECT
        CASE WHEN b.balance > 0 THEN
          format('%s %s (%s): KES %s',
            s.first_name, s.last_name, coalesce(s.grade, ''),
            b.balance)
        ELSE NULL END
        FROM public.students s
        JOIN public.guardians_link gl ON gl.student_id = s.id
        JOIN LATERAL (
          SELECT
            coalesce((
              SELECT sum(ft.amount) FROM public.fee_types ft
               WHERE ft.deleted_at IS NULL
            ), 0)
            - coalesce((
              SELECT sum(pay.amount) FROM public.payments pay
               WHERE pay.student_id = s.id
                 AND pay.status = 'paid'
            ), 0) AS balance
        ) b ON true
       WHERE gl.parent_id = v_parent.parent_id
         AND s.status = 'active' AND s.deleted_at IS NULL
       ORDER BY s.first_name
    );

    v_lines := ARRAY(SELECT x FROM unnest(v_lines) AS x WHERE x IS NOT NULL);
    CONTINUE WHEN array_length(v_lines, 1) IS NULL;

    v_line := array_to_string(v_lines[1:least(3, array_length(v_lines, 1))], '; ');
    v_more := array_length(v_lines, 1);
    IF v_more > 3 THEN
      v_line := v_line || '… and ' || (v_more - 3) || ' more';
    END IF;

    INSERT INTO public.notifications
      (channel, recipient, body, status, related_type, related_id, external_id)
    SELECT
      'sms', v_parent.phone,
      format('eShule: %s, fees reminder for %s. Outstanding: %s. Pay now at %s/parent/pay',
        v_parent.parent_name, coalesce(v_school_name, 'your child(ren)'),
        v_line, v_app_url),
      'queued', 'parent', v_parent.parent_id,
      'payment-reminder:' || v_parent.parent_id || ':' || to_char(current_date, 'YYYY-MM-DD')
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
       WHERE n.external_id = 'payment-reminder:' || v_parent.parent_id || ':' || to_char(current_date, 'YYYY-MM-DD')
    );
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enqueue_teacher_task_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer;
BEGIN
  INSERT INTO public.notifications (related_type, related_id, channel, recipient_user_id, body, status, external_id)
  SELECT 'teacher_task', t.id, 'in_app', p.id,
    'Reminder: ' || t.title || ' is due ' || to_char(t.due_at AT TIME ZONE 'Africa/Nairobi', 'DD Mon HH24:MI'),
    'queued', 'teacher-task-reminder:' || t.id::text
  FROM public.teacher_tasks t
  JOIN public.teachers te ON te.id = t.teacher_id
  JOIN public.profiles p ON p.id = te.profile_id
  WHERE t.status IN ('open','in_progress')
    AND t.reminder_sent_at IS NULL
    AND t.due_at <= now() + make_interval(mins => t.reminder_minutes)
    AND t.due_at >= now() - interval '24 hours'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_session_occurrences(
  p_session_id uuid,
  p_through date DEFAULT current_date + 56
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.session_occurrences (
    session_id, occurs_on, start_time, end_time, room, class, teacher_id, status
  )
  SELECT
    session.id, day::date, session.start_time, session.end_time,
    session.room, session.class, session.teacher_id, 'scheduled'
  FROM public.sessions session
  CROSS JOIN LATERAL generate_series(current_date, p_through, interval '1 day') day
  WHERE session.id = p_session_id
    AND session.active IS TRUE
    AND session.deleted_at IS NULL
    AND extract(isodow FROM day)::integer = session.day_of_week
  ON CONFLICT (session_id, occurs_on) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_same_tenant_guardian()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Tenancy removed: only verify both sides of the link exist.
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = NEW.student_id) THEN
    RAISE EXCEPTION 'Student % not found', NEW.student_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.parents WHERE id = NEW.parent_id) THEN
    RAISE EXCEPTION 'Parent % not found', NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Dead tenant-module seeder (fired on tenants inserts; tenants is gone).
DO $$ BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_tenants_seed_modules ON public.tenants';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.seed_tenant_modules_defaults();
