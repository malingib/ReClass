------------------------------------------------------------------
-- Phase 6 — Database fixes
-- 1. Add missing timestamps + updated_at triggers
-- 2. Cleanup old sent/failed notifications (TTL)
-- 3. Notifications archival RPC + cron job
------------------------------------------------------------------

------------------------------------------------------------------
-- 1. session_occurrences — add created_at, updated_at
------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'session_occurrences' AND column_name = 'created_at') THEN
    ALTER TABLE public.session_occurrences ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'session_occurrences' AND column_name = 'updated_at') THEN
    ALTER TABLE public.session_occurrences ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_session_occurrences_updated ON public.session_occurrences;
CREATE TRIGGER trg_session_occurrences_updated
  BEFORE UPDATE ON public.session_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

------------------------------------------------------------------
-- 2. teacher_attendance — add updated_at
------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'teacher_attendance' AND column_name = 'updated_at') THEN
    ALTER TABLE public.teacher_attendance ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_teacher_attendance_updated ON public.teacher_attendance;
CREATE TRIGGER trg_teacher_attendance_updated
  BEFORE UPDATE ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

------------------------------------------------------------------
-- 3. remedial_groups — add created_at, updated_at
------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'remedial_groups') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'remedial_groups' AND column_name = 'created_at') THEN
      ALTER TABLE public.remedial_groups ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'remedial_groups' AND column_name = 'updated_at') THEN
      ALTER TABLE public.remedial_groups ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'remedial_groups') THEN
    DROP TRIGGER IF EXISTS trg_remedial_groups_updated ON public.remedial_groups;
    CREATE TRIGGER trg_remedial_groups_updated
      BEFORE UPDATE ON public.remedial_groups
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

------------------------------------------------------------------
-- 4. subjects — add created_at, updated_at
------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subjects' AND column_name = 'created_at') THEN
    ALTER TABLE public.subjects ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subjects' AND column_name = 'updated_at') THEN
    ALTER TABLE public.subjects ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_subjects_updated ON public.subjects;
CREATE TRIGGER trg_subjects_updated
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

------------------------------------------------------------------
-- 5. parents — add updated_at
------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'parents' AND column_name = 'updated_at') THEN
    ALTER TABLE public.parents ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_parents_updated ON public.parents;
CREATE TRIGGER trg_parents_updated
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

------------------------------------------------------------------
-- 6. Index on session_occurrences(tenant_id, occurs_on) for
--    dashboard query performance (covering existing partial index)
------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_session_occurrences_tenant_date
  ON public.session_occurrences(tenant_id, occurs_on);

------------------------------------------------------------------
-- 7. Index on notifications(created_at) for cleanup queries
------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at);

------------------------------------------------------------------
-- 8. RPC: clean up sent/failed notifications older than N days
--    (prevents unbounded table growth — DB7 resolution)
------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_notifications(
  p_older_than_days int DEFAULT 90
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cutoff timestamptz;
  v_deleted int;
BEGIN
  v_cutoff := now() - (p_older_than_days || ' days')::interval;
  DELETE FROM public.notifications
  WHERE status IN ('sent', 'failed')
    AND created_at < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_notifications(int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_notifications(int) TO service_role;

------------------------------------------------------------------
-- 9. Cron job: run cleanup weekly (Sunday 03:00)
------------------------------------------------------------------
SELECT cron.schedule(
  'reclass-cleanup-notifications',
  '0 3 * * 0',
  $$SELECT public.cleanup_notifications(90);$$
);
