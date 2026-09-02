-- Fix dashboard statistics view against the current SIS schema.
-- sis_classes uses status (not active), and SIS admissions are stored in sis_admissions.

CREATE OR REPLACE VIEW public.sis_stats_view AS
SELECT
  s.tenant_id,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COUNT(DISTINCT se.id) AS total_sessions,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_classes,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.created_at >= NOW() - INTERVAL '30 days'
  ) AS recent_admissions,
  COUNT(DISTINCT e.id) AS total_enrollments
FROM public.students s
LEFT JOIN public.teachers t
  ON t.tenant_id = s.tenant_id
 AND t.deleted_at IS NULL
LEFT JOIN public.sessions se
  ON se.tenant_id = s.tenant_id
 AND se.active = true
LEFT JOIN public.sis_classes c
  ON c.tenant_id = s.tenant_id
LEFT JOIN public.sis_admissions a
  ON a.tenant_id = s.tenant_id
LEFT JOIN public.sis_enrollments e
  ON e.tenant_id = s.tenant_id
WHERE s.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  AND s.deleted_at IS NULL
GROUP BY s.tenant_id;
