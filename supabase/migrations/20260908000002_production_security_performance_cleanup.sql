-- Production security/performance cleanup
ALTER TABLE public.impersonation_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_unmatched_payments_tenant_id
  ON public.unmatched_payments (tenant_id);

DROP INDEX IF EXISTS public.session_occurrences_tenant_date_idx;

REVOKE EXECUTE ON FUNCTION public.aggregate_payroll_counts(uuid,date,date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_same_tenant_guardian() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_payment_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_session_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_attendance_marked() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_session_allocation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_unmatched_deposit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_session_occurrences() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_tenant_modules_defaults() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_context(uuid) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION app.tenant_id() SET search_path = app, public;
ALTER FUNCTION public.set_teacher_invoice_updated_at() SET search_path = public;
ALTER FUNCTION public.set_sis_updated_at() SET search_path = public;
ALTER FUNCTION public.set_comm_updated_at() SET search_path = public;
ALTER FUNCTION public.enqueue_session_reminders() SET search_path = public;
ALTER FUNCTION public.enqueue_payment_reminders() SET search_path = public;
ALTER FUNCTION public.notify_attendance_marked() SET search_path = public;
ALTER FUNCTION public.notify_session_allocation() SET search_path = public;
ALTER FUNCTION public.notify_unmatched_deposit() SET search_path = public;

GRANT EXECUTE ON FUNCTION public.enqueue_session_reminders() TO postgres;
GRANT EXECUTE ON FUNCTION public.enqueue_payment_reminders() TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_session_occurrences() TO postgres;
GRANT EXECUTE ON FUNCTION public.notify_attendance_marked() TO postgres;
GRANT EXECUTE ON FUNCTION public.notify_session_allocation() TO postgres;
GRANT EXECUTE ON FUNCTION public.notify_unmatched_deposit() TO postgres;
GRANT EXECUTE ON FUNCTION public.seed_tenant_modules_defaults() TO postgres;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO postgres;
