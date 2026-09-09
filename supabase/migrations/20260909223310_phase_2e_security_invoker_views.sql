-- Prevent reporting views from bypassing the querying user's RLS.
alter view public.sis_stats_view set (security_invoker = true);
alter view public.v_teacher_attendance_daily set (security_invoker = true);
alter view public.v_payroll_weekly set (security_invoker = true);
alter view public.v_teacher_payment_breakdown set (security_invoker = true);
