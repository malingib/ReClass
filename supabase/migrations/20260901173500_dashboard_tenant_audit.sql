-- ReClass Migration 20260901173500 — dashboard tenant scope + governance audit

-- The dashboard RPC previously aggregated shared tables without an explicit
-- tenant predicate. It now derives the active tenant from app.tenant_id and
-- returns no cross-tenant data when the tenant context is absent.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := NULLIF(current_setting('app.tenant_id', true), '')::uuid;
  since timestamptz := now() - interval '14 days';
  result jsonb;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant context is required';
  END IF;

  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM public.students WHERE tenant_id = v_tenant_id AND deleted_at IS NULL),
    'teachers', (SELECT count(*) FROM public.teachers WHERE tenant_id = v_tenant_id AND deleted_at IS NULL),
    'subjects', (SELECT count(*) FROM public.subjects WHERE tenant_id = v_tenant_id AND deleted_at IS NULL),
    'groups', (SELECT count(*) FROM public.sessions WHERE tenant_id = v_tenant_id AND deleted_at IS NULL),
    'unpaid', (SELECT count(*) FROM public.invoices WHERE tenant_id = v_tenant_id AND status = 'unpaid' AND deleted_at IS NULL),
    'paidInvoices', (SELECT count(*) FROM public.invoices WHERE tenant_id = v_tenant_id AND status = 'paid' AND deleted_at IS NULL),
    'unpaidAmount', (SELECT COALESCE(SUM(amount_due - COALESCE(amount_paid, 0)), 0) FROM public.invoices WHERE tenant_id = v_tenant_id AND status = 'unpaid' AND deleted_at IS NULL),
    'attendanceRate', (
      SELECT CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE status IN ('present','late')))::numeric / count(*) * 100)
        ELSE 0 END
      FROM public.teacher_attendance
      WHERE tenant_id = v_tenant_id AND marked_at >= since AND deleted_at IS NULL
    ),
    'sessionsCount', (SELECT count(*) FROM public.session_occurrences WHERE tenant_id = v_tenant_id AND occurs_on >= since::date),
    'recentStudents', (
      SELECT jsonb_agg(jsonb_build_object('id', id, 'admission_no', admission_no, 'first_name', first_name, 'last_name', last_name, 'grade', grade, 'created_at', created_at) ORDER BY created_at DESC)
      FROM (SELECT * FROM public.students WHERE tenant_id = v_tenant_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5) s
    ),
    'recentInvoices', (
      SELECT jsonb_agg(jsonb_build_object('id', i.id, 'amount_due', i.amount_due, 'amount_paid', i.amount_paid, 'status', i.status, 'due_date', i.due_date, 'created_at', i.created_at, 'parent_name', 'Parent', 'student_name', s.first_name || ' ' || s.last_name, 'admission_no', s.admission_no) ORDER BY i.created_at DESC)
      FROM (SELECT * FROM public.invoices WHERE tenant_id = v_tenant_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5) i
      LEFT JOIN public.students s ON s.id = i.student_id AND s.tenant_id = v_tenant_id
    ),
    'trend', (
      SELECT jsonb_agg(jsonb_build_object('label', to_char(d::date, 'Mon DD'), 'value', CASE WHEN cnt > 0 THEN round(present::numeric / cnt * 100) ELSE 0 END) ORDER BY d)
      FROM (
        SELECT d::date AS d, count(ta.id) AS cnt, count(*) FILTER (WHERE ta.status IN ('present','late')) AS present
        FROM generate_series(date_trunc('day', since), date_trunc('day', now()), '1 day'::interval) d
        LEFT JOIN public.teacher_attendance ta ON date_trunc('day', ta.marked_at) = d::date AND ta.tenant_id = v_tenant_id AND ta.deleted_at IS NULL
        GROUP BY d::date
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- Governance/financial status changes become auditable without making the
-- audit layer an authorization mechanism.
CREATE OR REPLACE FUNCTION public.audit_payroll_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.amount IS DISTINCT FROM NEW.amount THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, action, entity, entity_id, before, after, created_at)
    VALUES (
      NEW.tenant_id,
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

DROP TRIGGER IF EXISTS trg_audit_payroll_change ON public.payroll_runs;
CREATE TRIGGER trg_audit_payroll_change
  AFTER INSERT OR UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_payroll_change();
