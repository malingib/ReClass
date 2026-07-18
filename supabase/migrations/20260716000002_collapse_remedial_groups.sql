-- ReClass migration: collapse remedial_groups into class-scoped sessions.
-- Remedial is run for a whole class (grade), not a pulled-aside cohort, so the
-- remedial_groups + group_members abstraction is removed. Sessions now carry
-- class (grade text), subject_id and teacher_id directly.

-- NOTE: public.sessions was created with a touch_updated_at() trigger
-- (trg_sessions_updated) but no updated_at/created_at columns, so every UPDATE
-- on sessions failed. Add the columns the trigger expects (root-cause fix).
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 1. Add the new session columns.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id),
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id);

-- 2. Backfill class/subject/teacher from the old group (best-effort; groups may
--    already be gone). Falls back to leaving the columns null where no group.
--    Guarded so it only runs when the old columns still exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'group_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'remedial_groups'
  ) THEN
    UPDATE public.sessions s
    SET class = g.name,
        subject_id = g.subject_id,
        teacher_id = g.teacher_id
    FROM public.remedial_groups g
    WHERE s.group_id = g.id;
  END IF;
END $$;

-- 3. Drop the group linkage, then the dead tables.
ALTER TABLE public.sessions DROP COLUMN IF EXISTS group_id;
DROP TABLE IF EXISTS public.group_members;
DROP TABLE IF EXISTS public.remedial_groups;

-- 4. Index for the teacher-attendance roster lookup (sessions by teacher + day).
CREATE INDEX IF NOT EXISTS sessions_teacher_day_idx
  ON public.sessions (tenant_id, teacher_id, day_of_week);
