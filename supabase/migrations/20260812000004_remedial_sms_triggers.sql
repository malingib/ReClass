-- ==========================================================================
-- eShule communications: remedial SMS triggers + reminder crons (2026-08-12)
-- ==========================================================================
-- Closes the founder's missing alert layer:
--   1. Session allocation → SMS to the teacher when a remedial session is
--      created/assigned (respects sms_attendance toggle; reuses teacher phone).
--   2. Session-time reminder → cron enqueues an SMS to the teacher ~2h before
--      each scheduled occurrence they are assigned (deduped per occurrence).
--   3. Parent payment reminder → DB-side enqueue (replaces the removed
--      `payment-reminders` Edge Function and its stale cron job). Bills a
--      parent's SMS to the tenant only when sms_payment_reminder is enabled.
-- All rows land in `notifications` (channel='sms') and drain through the
-- existing `notify` Edge Function (Mobiwave).
-- ==========================================================================

-- ── 1. Session allocation SMS ─────────────────────────────────────────────
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
    INTO v_toggle FROM public.tenants WHERE id = NEW.tenant_id;
  IF NOT coalesce(v_toggle, true) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (tenant_id, channel, body, status, related_type, related_id, recipient)
  VALUES (
    NEW.tenant_id, 'sms',
    format('eShule: You have been assigned a remedial %s (%s to %s). Mark your attendance at class time.',
      COALESCE(NEW.class, 'class'), to_char(NEW.start_time, 'HH24:MI'), to_char(NEW.end_time, 'HH24:MI')),
    'queued', 'session', NEW.id, v_phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_session_allocation ON public.sessions;
CREATE TRIGGER trg_notify_session_allocation
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_session_allocation();

-- ── 2. Session-time reminder (teacher) — 2h before occurrence ─────────────
CREATE OR REPLACE FUNCTION public.enqueue_session_reminders()
RETURNS integer AS $$
DECLARE
  v_inserted integer := 0;
  row record;
  v_phone text;
  v_toggle boolean;
BEGIN
  FOR row IN
    SELECT so.id, so.tenant_id, so.teacher_id, so.occurs_on, so.start_time, s.class AS class_name
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
      INTO v_toggle FROM public.tenants WHERE id = row.tenant_id;
    CONTINUE WHEN NOT coalesce(v_toggle, true);

    INSERT INTO public.notifications
      (tenant_id, channel, recipient, body, status, related_type, related_id, external_id)
    VALUES (
      row.tenant_id, 'sms', v_phone,
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

-- Run every 15 minutes so no occurrence is missed between cron ticks.
SELECT cron.schedule(
  'reclass-session-reminders',
  '*/15 * * * *',
  $$SELECT public.enqueue_session_reminders();$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclass-session-reminders');

-- ── 3. Parent payment reminder (DB-side, replaces removed edge fn) ─────────
CREATE OR REPLACE FUNCTION public.enqueue_payment_reminders()
RETURNS integer AS $$
DECLARE
  v_inserted integer := 0;
  row record;
  v_toggle boolean;
  v_amount numeric;
BEGIN
  FOR row IN
    SELECT p.id AS parent_id, p.tenant_id, p.phone,
           s.id AS student_id, s.first_name, s.last_name,
           coalesce((
             SELECT sum(ft.amount)
               FROM public.fee_types ft
              WHERE ft.tenant_id = p.tenant_id
                AND ft.domain = 'remedial' AND ft.deleted_at IS NULL
           ), 0) AS obligation,
           coalesce((
             SELECT sum(pay.amount)
               FROM public.payments pay
              WHERE pay.tenant_id = p.tenant_id
                AND pay.student_id = s.id
                AND pay.domain = 'remedial'
                AND pay.status = 'paid'
           ), 0) AS paid
      FROM public.parents p
      JOIN public.guardians_link gl ON gl.parent_id = p.id
      JOIN public.students s ON s.id = gl.student_id AND s.tenant_id = p.tenant_id
     WHERE p.deleted_at IS NULL
       AND p.phone IS NOT NULL
       AND p.sms_consent = true
       AND s.status = 'active' AND s.deleted_at IS NULL
    LIMIT 500
  LOOP
    v_amount := row.obligation - row.paid;
    CONTINUE WHEN v_amount <= 0;

    SELECT (settings ->> 'sms_payment_reminder')::boolean
      INTO v_toggle FROM public.tenants WHERE id = row.tenant_id;
    CONTINUE WHEN NOT coalesce(v_toggle, true);

    INSERT INTO public.notifications
      (tenant_id, channel, recipient, body, status, related_type, related_id, external_id)
    SELECT
      row.tenant_id, 'sms', row.phone,
      format('eShule: %s %s has a remedial fees balance of KES %s. Pay via the parent portal or M-Pesa.',
        row.first_name, row.last_name, v_amount),
      'queued', 'student', row.student_id,
      'payment-reminder:' || row.student_id || ':' || to_char(current_date, 'YYYY-MM-DD')
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
       WHERE n.external_id = 'payment-reminder:' || row.student_id || ':' || to_char(current_date, 'YYYY-MM-DD')
    );
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily 07:00 (parents read reminders before school). Dedupe is per-student-day.
SELECT cron.schedule(
  'reclass-payment-reminders',
  '0 7 * * *',
  $$SELECT public.enqueue_payment_reminders();$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclass-payment-reminders');

GRANT EXECUTE ON FUNCTION public.notify_session_allocation() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_session_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_payment_reminders() TO service_role;