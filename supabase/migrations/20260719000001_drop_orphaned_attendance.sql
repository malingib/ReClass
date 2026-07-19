-- ReClass Migration 20260719000001 — Drop orphaned student `attendance` table
-- The application no longer tracks student attendance (only teacher_attendance).
-- The `attendance` table and its RLS policy are dead schema left over from an
-- earlier design. All code references were removed in a prior commit.
-- The table is confirmed empty (0 rows) before drop.

-- Drop the orphaned RLS policy first
DROP POLICY IF EXISTS attendance_isolation ON public.attendance;

-- Drop the table (cascade in case of any lingering dependent objects)
DROP TABLE IF EXISTS public.attendance CASCADE;
