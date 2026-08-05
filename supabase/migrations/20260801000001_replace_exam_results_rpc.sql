CREATE OR REPLACE FUNCTION public.replace_exam_results(
  p_tenant_id uuid,
  p_exam_id uuid,
  p_actor_id uuid,
  p_entries jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_entry_count int;
BEGIN
  IF p_tenant_id IS NULL OR p_exam_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'missing_required_argument' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'entries_must_be_array' USING ERRCODE = '22023';
  END IF;

  v_entry_count := jsonb_array_length(p_entries);
  IF v_entry_count > 1000 THEN
    RAISE EXCEPTION 'too_many_entries' USING ERRCODE = '54000';
  END IF;

  SELECT *
    INTO v_exam
    FROM public.exams
   WHERE id = p_exam_id
     AND tenant_id = p_tenant_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = p_actor_id
       AND role IN ('school_admin', 'super_admin')
       AND (tenant_id = p_tenant_id OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE tmp_exam_results (
    student_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    score numeric(5,2) NOT NULL,
    grade text,
    remarks text
  ) ON COMMIT DROP;

  INSERT INTO tmp_exam_results (student_id, subject_id, score, grade, remarks)
  SELECT
    (entry->>'student_id')::uuid,
    (entry->>'subject_id')::uuid,
    (entry->>'score')::numeric,
    NULLIF(left(coalesce(entry->>'grade', ''), 20), ''),
    NULLIF(left(coalesce(entry->>'remarks', ''), 500), '')
  FROM jsonb_array_elements(p_entries) AS entry;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results
     WHERE score < 0 OR score > v_exam.max_score
  ) THEN
    RAISE EXCEPTION 'score_out_of_range' USING ERRCODE = '22003';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results
     GROUP BY student_id, subject_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_result' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results r
      LEFT JOIN public.students s
        ON s.id = r.student_id
       AND s.tenant_id = p_tenant_id
       AND s.deleted_at IS NULL
     WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_student' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM tmp_exam_results r
      LEFT JOIN public.subjects s
        ON s.id = r.subject_id
       AND s.tenant_id = p_tenant_id
       AND s.deleted_at IS NULL
     WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_subject' USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.exam_results
   WHERE tenant_id = p_tenant_id
     AND exam_id = p_exam_id;

  INSERT INTO public.exam_results (
    tenant_id, exam_id, student_id, subject_id, score, grade, remarks, created_by
  )
  SELECT
    p_tenant_id, p_exam_id, student_id, subject_id, score, grade, remarks, p_actor_id
  FROM tmp_exam_results;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_exam_results(uuid, uuid, uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_exam_results(uuid, uuid, uuid, jsonb) TO service_role;
