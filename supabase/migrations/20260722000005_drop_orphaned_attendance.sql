-- ReClass Migration 20260722000005 — Drop orphaned public.attendance table
--
-- Two conflicting migrations created and then restored this table, but no
-- application code references it. Student attendance tracking was dropped
-- from the feature set; only teacher_attendance is used.
DROP TABLE IF EXISTS public.attendance CASCADE;
