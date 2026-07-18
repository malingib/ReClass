-- ReClass Migration — Admin dashboard stats RPC
-- Collapses 13 separate queries into a single function call

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  since timestamptz := now() - interval '14 days';
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'students',      (SELECT count(*) FROM public.students WHERE deleted_at IS NULL),
    'teachers',      (SELECT count(*) FROM public.teachers WHERE deleted_at IS NULL),
    'subjects',      (SELECT count(*) FROM public.subjects WHERE deleted_at IS NULL),
    'groups',        (SELECT count(*) FROM public.sessions WHERE deleted_at IS NULL),
    'unpaid',        (SELECT count(*) FROM public.invoices WHERE status = 'unpaid' AND deleted_at IS NULL),
    'paidInvoices',  (SELECT count(*) FROM public.invoices WHERE status = 'paid' AND deleted_at IS NULL),
    'unpaidAmount',  (SELECT COALESCE(SUM(amount_due - COALESCE(amount_paid, 0)), 0) FROM public.invoices WHERE status = 'unpaid' AND deleted_at IS NULL),
    'attendanceRate', (
      SELECT CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE status IN ('present','late')))::numeric / count(*) * 100)
        ELSE 0 END
      FROM public.teacher_attendance
      WHERE marked_at >= since AND deleted_at IS NULL
    ),
    'sessionsCount', (SELECT count(*) FROM public.session_occurrences WHERE occurs_on >= since),
    'recentStudents', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'admission_no', admission_no, 'first_name', first_name,
        'last_name', last_name, 'grade', grade, 'created_at', created_at
      ) ORDER BY created_at DESC)
      FROM (SELECT * FROM public.students WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5) s
    ),
    'recentInvoices', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'amount_due', i.amount_due, 'amount_paid', i.amount_paid,
        'status', i.status, 'due_date', i.due_date, 'created_at', i.created_at,
        'parent_name', 'Parent',
        'student_name', s.first_name || ' ' || s.last_name,
        'admission_no', s.admission_no
      ) ORDER BY i.created_at DESC)
      FROM (SELECT * FROM public.invoices WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5) i
      LEFT JOIN public.students s ON s.id = i.student_id
    ),
    'trend', (
      SELECT jsonb_agg(jsonb_build_object(
        'label', to_char(d::date, 'Mon DD'),
        'value', CASE WHEN cnt > 0 THEN round(present::numeric / cnt * 100) ELSE 0 END
      ) ORDER BY d)
      FROM (
        SELECT d::date AS d,
               count(*) AS cnt,
               count(*) FILTER (WHERE ta.status IN ('present','late')) AS present
        FROM generate_series(date_trunc('day', since), date_trunc('day', now()), '1 day'::interval) d
        LEFT JOIN public.teacher_attendance ta
          ON date_trunc('day', ta.marked_at) = d::date AND ta.deleted_at IS NULL
        GROUP BY d::date
      ) sub
    ),
    'activity', (
      SELECT jsonb_agg(sub.item ORDER BY sub.ts DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', 'att-' || ta.id, 'name', 'Teacher', 'detail', 'Attendance marked',
          'time', ta.marked_at, 'kind', 'attendance', 'badge', ta.status
        ) AS item, ta.marked_at AS ts
        FROM public.teacher_attendance ta WHERE ta.marked_at >= since AND ta.deleted_at IS NULL
        LIMIT 4
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;
