-- Read-only live contract check for the ReClass deployment.
-- Run: SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=rlswdeswlkuaigwtojxw \
--      node scripts/sb-sql.mjs file:scripts/live-verify.sql
-- Never paste the token in chat or commit it; export it in your shell only.
--
-- Expected: every UI table/view/RPC present, RLS enabled on user tables,
-- EXCEPT permissions + role_permissions (code map fallback in
-- apps/web-react/src/lib/rbac.ts until a migration ships them).
SELECT json_build_object(
  'tables_present', (
    SELECT coalesce(json_agg(c.relname ORDER BY c.relname), '[]'::json)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (
      'attendance','comm_announcements','expenses','fee_types','guardians_link',
      'invoices','notifications','other_income','parents','payments','payroll_runs',
      'profiles','reclass_committee_assignments','reclass_committee_roles',
      'school_calendar_events','school_settings','session_occurrences','sessions',
      'sis_admissions','sis_classes','sis_enrollments','student_exit_records',
      'students','subjects','teacher_attendance','teachers','tenants','terms',
      'unmatched_payments','user_roles'
    )
  ),
  'rls_off', (
    SELECT coalesce(json_agg(c.relname ORDER BY c.relname), '[]'::json)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity AND c.relname IN (
      'students','teachers','payments','invoices','expenses','teacher_attendance',
      'user_roles','parents','payroll_runs','unmatched_payments'
    )
  ),
  'views_present', (
    SELECT coalesce(json_agg(c.relname ORDER BY c.relname), '[]'::json)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
      AND c.relname = 'v_teacher_attendance_daily'
  ),
  'rpcs_present', (
    SELECT coalesce(json_agg(p.proname ORDER BY p.proname), '[]'::json)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'appoint_reclass_committee_member','end_reclass_committee_assignment',
      'get_parent_reclass_payments','mark_own_teacher_attendance',
      'review_teacher_attendance','set_current_term'
    )
  ),
  'known_absent', (
    SELECT coalesce(json_agg(c.relname ORDER BY c.relname), '[]'::json)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('permissions','role_permissions')
  )
);
