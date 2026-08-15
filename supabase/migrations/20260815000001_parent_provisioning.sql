-- ==========================================================================
-- eShule parent provisioning + per-user notification scoping (2026-08-15)
-- ==========================================================================
-- Closes the founder's onboarding + privacy + alert-coverage gaps:
--   1. parents/profiles gain national_id (the parent login identifier) and
--      parents.auth_email (deterministic auth account used by the login page).
--   2. notifications gains recipient_user_id + priority so in-app alerts are
--      targeted to a specific user instead of leaking tenant-wide.
--   3. notify edge fn now marks in-app rows 'sent' (instead of 'failed') and
--      leaves email rows 'failed' (email channel is not wired yet).
--   4. Attendance alert targets the principal(s) only (in-app high priority +
--      SMS to principal phone when sms_attendance is on).
--   5. Unmatched manual deposits raise a high-priority in-app alert to
--      bursar/school_admin so real revenue is never silently parked.
--   6. The dead trg_notify_invoice (invoices table was dropped) is removed.
--   7. Payment reminders are rebuilt per-parent (aggregates ALL their children,
--      school + remedial) with a pay deep-link, instead of one SMS per child
--      limited to the remedial domain.
--   8. RLS on notifications scopes the browser inbox to the signed-in user
--      (in-app rows addressed to them or broadcast), closing the API-level
--      cross-role leak.
-- ==========================================================================

-- ── 1. national_id + auth_email on parents + profiles ─────────────────────
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS auth_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS national_id text;

-- One national ID per parent within a tenant (nulls allowed during migration).
DROP INDEX IF EXISTS parents_tenant_national_id_key;
CREATE UNIQUE INDEX parents_tenant_national_id_key
  ON public.parents (tenant_id, national_id) WHERE national_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parents_national_id_lookup
  ON public.parents (tenant_id, national_id, phone)
  WHERE national_id IS NOT NULL AND phone IS NOT NULL;

-- ── 2. notifications: per-user targeting + priority ───────────────────────
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_user_id uuid
  REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority text
  DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications (tenant_id, recipient_user_id) WHERE recipient_user_id IS NOT NULL;

-- ── 3. RLS: the browser inbox sees ONLY in-app rows addressed to the signed ─
--    -in user (or broadcast rows). SMS/email rows stay server/edge-only. This
--    closes the cross-role leak at the API boundary; app code also scopes.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_inapp_self ON public.notifications;
CREATE POLICY notifications_inapp_self ON public.notifications
  FOR SELECT
  USING (
    channel = 'inapp'
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  );

DROP POLICY IF EXISTS notifications_inapp_self_delete ON public.notifications;
CREATE POLICY notifications_inapp_self_delete ON public.notifications
  FOR DELETE
  USING (
    channel = 'inapp'
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  );

-- ── 4. Attendance alert → principal(s) only (in-app high + SMS) ───────────
DROP TRIGGER IF EXISTS trg_notify_attendance ON public.teacher_attendance;
DROP FUNCTION IF EXISTS public.notify_attendance_marked();
CREATE FUNCTION public.notify_attendance_marked()
RETURNS trigger AS $$
DECLARE
  v_principal record;
  v_toggle boolean;
BEGIN
  SELECT (settings ->> 'sms_attendance')::boolean
    INTO v_toggle FROM public.tenants WHERE id = NEW.tenant_id;
  IF NOT coalesce(v_toggle, true) THEN
    RETURN NEW;
  END IF;

  FOR v_principal IN
    SELECT ur.user_id
      FROM public.user_roles ur
     WHERE ur.tenant_id = NEW.tenant_id
       AND ur.role = 'principal'
  LOOP
    INSERT INTO public.notifications
      (tenant_id, channel, recipient_user_id, priority, body, status,
       related_type, related_id)
    VALUES (
      NEW.tenant_id, 'inapp', v_principal.user_id, 'high',
      CASE
        WHEN NEW.status = 'absent' THEN 'A teacher was marked absent for a remedial session.'
        WHEN NEW.status = 'late' THEN 'A teacher was marked late for a remedial session.'
        ELSE 'Teacher attendance marked as ' || NEW.status || '.'
      END,
      'queued',
      'teacher_attendance',
      NEW.id
    );

    -- Also SMS the principal (they may not watch the portal).
    INSERT INTO public.notifications
      (tenant_id, channel, recipient, body, status, related_type, related_id)
    SELECT
      NEW.tenant_id, 'sms', p.phone,
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

CREATE TRIGGER trg_notify_attendance
  AFTER INSERT ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_marked();

-- ── 5. Unmatched manual deposit → alert bursar + school_admin ─────────────
CREATE OR REPLACE FUNCTION public.notify_unmatched_deposit()
RETURNS trigger AS $$
DECLARE
  v_user record;
BEGIN
  -- Deposits with an unknown admission number have no tenant yet; the queue is
  -- reviewed by staff, so we cannot target anyone. Skip those.
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_user IN
    SELECT ur.user_id
      FROM public.user_roles ur
     WHERE ur.tenant_id = NEW.tenant_id
       AND ur.role IN ('bursar', 'school_admin')
  LOOP
    INSERT INTO public.notifications
      (tenant_id, channel, recipient_user_id, priority, body, status,
       related_type, related_id, external_id)
    VALUES (
      NEW.tenant_id, 'inapp', v_user.user_id, 'high',
      format('A manual M-Pesa deposit of KES %s (ref %s) could not be matched automatically. Review the unmatched payments queue.',
        NEW.amount, COALESCE(NULLIF(btrim(NEW.bill_ref), ''), NULLIF(NEW.mpesa_receipt, ''), NEW.checkout_id)),
      'queued', 'unmatched_payment', NEW.id,
      'unmatched:' || NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_unmatched ON public.unmatched_payments;
CREATE TRIGGER trg_notify_unmatched
  AFTER INSERT ON public.unmatched_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_unmatched_deposit();

-- ── 6. drop the dead invoice trigger (invoice lifecycle removed 20260731) ──
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_invoice ON public.invoices;
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.notify_invoice_created();

-- ── 7. Payment reminders: per-parent, ALL children, school + remedial, ─────
--    with a pay deep-link. Replaces the remedial-only per-student version.
DROP FUNCTION IF EXISTS public.enqueue_payment_reminders();
CREATE OR REPLACE FUNCTION public.enqueue_payment_reminders()
RETURNS integer AS $$
DECLARE
  v_inserted integer := 0;
  v_parent record;
  v_toggle boolean;
  v_app_url text;
  v_lines text[];
  v_line text;
  v_more integer;
  v_line_item text;
BEGIN
  BEGIN
    v_app_url := coalesce(public.get_platform_config() ->> 'app_url', 'https://app.eshule.co.ke');
  EXCEPTION WHEN OTHERS THEN
    v_app_url := 'https://app.eshule.co.ke';
  END;

  FOR v_parent IN
    SELECT p.id AS parent_id, p.tenant_id, p.phone, p.full_name AS parent_name,
           t.name AS school_name
      FROM public.parents p
      JOIN public.tenants t ON t.id = p.tenant_id
     WHERE p.deleted_at IS NULL
       AND p.phone IS NOT NULL
       AND p.sms_consent = true
       AND EXISTS (
         SELECT 1 FROM public.guardians_link gl
         JOIN public.students s ON s.id = gl.student_id
          WHERE gl.parent_id = p.id
            AND s.tenant_id = p.tenant_id
            AND s.status = 'active' AND s.deleted_at IS NULL
       )
     LIMIT 200
  LOOP
    SELECT (settings ->> 'sms_payment_reminder')::boolean
      INTO v_toggle FROM public.tenants WHERE id = v_parent.tenant_id;
    CONTINUE WHEN NOT coalesce(v_toggle, true);

    -- Per-child outstanding balances across BOTH domains.
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
               WHERE ft.tenant_id = v_parent.tenant_id
                 AND ft.deleted_at IS NULL
            ), 0)
            - coalesce((
              SELECT sum(pay.amount) FROM public.payments pay
               WHERE pay.student_id = s.id
                 AND pay.tenant_id = v_parent.tenant_id
                 AND pay.status = 'paid'
            ), 0) AS balance
        ) b ON true
       WHERE gl.parent_id = v_parent.parent_id
         AND s.tenant_id = v_parent.tenant_id
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
      (tenant_id, channel, recipient, body, status, related_type, related_id, external_id)
    SELECT
      v_parent.tenant_id, 'sms', v_parent.phone,
      format('eShule: %s, fees reminder for %s. Outstanding: %s. Pay now at %s/parent/pay',
        v_parent.parent_name, coalesce(v_parent.school_name, 'your child(ren)'),
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

-- Daily 07:00 (parents read reminders before school). Dedupe is per-parent-day.
SELECT cron.schedule(
  'reclass-payment-reminders',
  '0 7 * * *',
  $$SELECT public.enqueue_payment_reminders();$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclass-payment-reminders');

-- ── 8. settings default for auto-provisioning SMS ─────────────────────────
-- (sms_provision_parent is read by the provisioning flow; default true.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'tenants' AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN settings jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.notify_attendance_marked() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_unmatched_deposit() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_payment_reminders() TO service_role;
