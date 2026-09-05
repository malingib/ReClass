-- The original optimization migration referenced legacy `admissions` and an
-- `active` flag on `sis_classes`. The current SIS schema uses `sis_admissions`
-- and `sis_classes.status`. Keep the optimized view valid for fresh database
-- replays so performance work does not leave the migration pipeline broken.
CREATE OR REPLACE VIEW public.sis_stats_view AS
SELECT
  s.tenant_id,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COUNT(DISTINCT se.id) AS total_sessions,
  COUNT(DISTINCT c.id) AS active_classes,
  COUNT(DISTINCT a.id) AS recent_admissions,
  COUNT(DISTINCT e.id) AS total_enrollments
FROM public.students s
LEFT JOIN public.teachers t
  ON s.tenant_id = t.tenant_id
 AND t.deleted_at IS NULL
LEFT JOIN public.sessions se
  ON s.tenant_id = se.tenant_id
 AND se.active = true
LEFT JOIN public.sis_classes c
  ON s.tenant_id = c.tenant_id
 AND c.status = 'active'
LEFT JOIN public.sis_admissions a
  ON s.tenant_id = a.tenant_id
 AND a.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN public.sis_enrollments e
  ON s.tenant_id = e.tenant_id
WHERE s.tenant_id = CURRENT_SETTING('app.tenant_id', true)::UUID
  AND s.deleted_at IS NULL
GROUP BY s.tenant_id;
