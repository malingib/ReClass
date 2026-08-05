-- ==========================================================================
-- Drop the exam & results module (2026-08-02)
-- ==========================================================================
-- Reverses 20260722000007_create_exams.sql and
-- 20260801000001_replace_exam_results_rpc.sql.  The exam/results module is
-- not part of the product at this point; the tables and RPC are removed.
-- History files are kept so the migration chain stays intact on live DBs.
-- ==========================================================================

DROP FUNCTION IF EXISTS public.replace_exam_results(uuid, uuid, uuid, jsonb);

DROP TABLE IF EXISTS public.exam_results;
DROP TABLE IF EXISTS public.exams;
