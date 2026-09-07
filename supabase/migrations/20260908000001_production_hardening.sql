-- ReClass Migration 20260908000001 — Production hardening and deployment reliability

CREATE INDEX IF NOT EXISTS idx_comm_announcements_created_by ON public.comm_announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_comm_templates_created_by ON public.comm_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guardians_link_tenant_id ON public.guardians_link(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_other_income_received_by ON public.other_income(received_by);
CREATE INDEX IF NOT EXISTS idx_other_income_tenant_id ON public.other_income(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_cashier_id ON public.payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_payments_deposited_by ON public.payments(deposited_by);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_teacher_id ON public.payroll_runs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_session_occurrences_teacher_id ON public.session_occurrences(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON public.sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sis_admissions_created_by ON public.sis_admissions(created_by);
CREATE INDEX IF NOT EXISTS idx_sis_classes_homeroom_teacher_id ON public.sis_classes(homeroom_teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON public.students(created_by);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_marked_by ON public.teacher_attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_reviewed_by ON public.teacher_attendance(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_tenants_current_term_id ON public.tenants(current_term_id);
CREATE INDEX IF NOT EXISTS idx_unmatched_payments_matched_by ON public.unmatched_payments(matched_by);
CREATE INDEX IF NOT EXISTS idx_unmatched_payments_matched_to ON public.unmatched_payments(matched_to);

REVOKE EXECUTE ON FUNCTION public.aggregate_payroll_counts(uuid,date,date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_same_tenant_guardian() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_payment_reminders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_session_reminders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_attendance_marked() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_session_allocation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_unmatched_deposit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_session_occurrences() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_tenant_modules_defaults() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_context(uuid) FROM anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_stale_checkout_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.checkout_requests
  SET status = 'failed',
      reason = 'TIMEOUT - Request was pending for too long and was automatically cancelled',
      updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_stale_checkout_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_checkout_requests() TO postgres;

SELECT cron.schedule(
  'cleanup-stale-checkouts',
  '*/5 * * * *',
  $$SELECT public.cleanup_stale_checkout_requests();$$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-checkouts'
);