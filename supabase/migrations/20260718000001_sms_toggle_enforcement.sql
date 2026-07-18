-- ReClass Migration 20260718000001 — Enforce tenant SMS toggle settings
-- The admin Settings > "SMS Toggles" tab stores {sms_attendance,
-- sms_payment_reminder, sms_payment_receipt} in tenants.settings jsonb, but no
-- producer ever read them. This migration:
--   1. Adds tenant_setting_enabled(p_tenant, p_key) -> boolean (default TRUE when
--      the key is missing, matching the UI's `setting ?? true` semantics).
--   2. Gates the attendance notification trigger on sms_attendance so that toggle
--      is no longer dead.
-- The two payment-SMS Edge Functions (payment-reminders, mpesa-callback) enforce
-- their toggles in code — see those files for the rpc() call.

CREATE OR REPLACE FUNCTION public.tenant_setting_enabled(p_tenant uuid, p_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_enabled boolean;
BEGIN
  SELECT (settings ->> p_key)::boolean INTO v_enabled FROM public.tenants WHERE id = p_tenant;
  RETURN coalesce(v_enabled, true);
END;
$$;
REVOKE ALL ON FUNCTION public.tenant_setting_enabled(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_setting_enabled(uuid, text) TO service_role;

-- Re-create the attendance trigger to honor sms_attendance.
-- (Invoice-created still always notifies in-app; there is no invoice SMS toggle.)
CREATE OR REPLACE FUNCTION public.notify_attendance_marked()
RETURNS trigger AS $$
BEGIN
  IF NOT public.tenant_setting_enabled(NEW.tenant_id, 'sms_attendance') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (tenant_id, channel, body, status, related_type, related_id, created_at)
  VALUES (
    NEW.tenant_id,
    'inapp',
    CASE
      WHEN NEW.status = 'absent' THEN 'A teacher was marked absent for a remedial session.'
      WHEN NEW.status = 'late' THEN 'A teacher was marked late for a remedial session.'
      ELSE 'Teacher attendance marked as ' || NEW.status || '.'
    END,
    'queued',
    'teacher_attendance',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
