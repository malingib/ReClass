-- Whole-class recurring sessions, generated occurrences, and teacher delivery approval.

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS room text;

ALTER TABLE public.session_occurrences
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.session_occurrences occurrence
SET class = session.class,
    teacher_id = session.teacher_id,
    room = coalesce(occurrence.room, session.room)
FROM public.sessions session
WHERE occurrence.session_id = session.id
  AND (occurrence.class IS NULL OR occurrence.teacher_id IS NULL);

ALTER TABLE public.teacher_attendance
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.teacher_attendance ALTER COLUMN approval_status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS session_occurrences_tenant_date_idx
  ON public.session_occurrences(tenant_id, occurs_on);
CREATE INDEX IF NOT EXISTS session_occurrences_teacher_date_idx
  ON public.session_occurrences(tenant_id, teacher_id, occurs_on);
CREATE INDEX IF NOT EXISTS teacher_attendance_pending_idx
  ON public.teacher_attendance(tenant_id, created_at)
  WHERE approval_status = 'pending' AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.generate_session_occurrences(
  p_session_id uuid,
  p_through date DEFAULT current_date + 56
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.session_occurrences (
    tenant_id, session_id, occurs_on, start_time, end_time, room, class, teacher_id, status
  )
  SELECT
    session.tenant_id, session.id, day::date, session.start_time, session.end_time,
    session.room, session.class, session.teacher_id, 'scheduled'
  FROM public.sessions session
  CROSS JOIN LATERAL generate_series(current_date, p_through, interval '1 day') day
  WHERE session.id = p_session_id
    AND session.active IS TRUE
    AND session.deleted_at IS NULL
    AND extract(isodow FROM day)::integer = session.day_of_week
  ON CONFLICT (session_id, occurs_on) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_session_occurrences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.session_occurrences occurrence
    WHERE occurrence.session_id = NEW.id
      AND occurrence.occurs_on >= current_date
      AND NOT EXISTS (
        SELECT 1 FROM public.teacher_attendance attendance
        WHERE attendance.occurrence_id = occurrence.id
      );
  END IF;

  IF NEW.active IS TRUE AND NEW.deleted_at IS NULL THEN
    PERFORM public.generate_session_occurrences(NEW.id, current_date + 56);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_session_occurrences ON public.sessions;
CREATE TRIGGER trg_refresh_session_occurrences
AFTER INSERT OR UPDATE OF class, room, teacher_id, day_of_week, start_time, end_time, active, deleted_at
ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.refresh_session_occurrences();

CREATE OR REPLACE FUNCTION public.generate_future_session_occurrences(
  p_through date DEFAULT current_date + 56
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row record;
  total integer := 0;
BEGIN
  FOR row IN SELECT id FROM public.sessions WHERE active IS TRUE AND deleted_at IS NULL LOOP
    total := total + public.generate_session_occurrences(row.id, p_through);
  END LOOP;
  RETURN total;
END;
$$;

SELECT public.generate_future_session_occurrences(current_date + 56);

SELECT cron.schedule(
  'reclass-session-occurrences',
  '15 0 * * *',
  $$SELECT public.generate_future_session_occurrences(current_date + 56);$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclass-session-occurrences');

CREATE OR REPLACE FUNCTION public.mark_own_teacher_attendance(
  p_tenant_id uuid,
  p_teacher_id uuid,
  p_profile_id uuid,
  p_occurrence_id uuid,
  p_status text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_teacher uuid;
  occurrence_date date;
  attendance_id uuid;
BEGIN
  IF p_status NOT IN ('present', 'late') THEN
    RETURN jsonb_build_object('status', 'invalid_status');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE id = p_teacher_id AND tenant_id = p_tenant_id
      AND profile_id = p_profile_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  SELECT coalesce(occurrence.teacher_id, session.teacher_id), occurrence.occurs_on
  INTO assigned_teacher, occurrence_date
  FROM public.session_occurrences occurrence
  JOIN public.sessions session ON session.id = occurrence.session_id
  WHERE occurrence.id = p_occurrence_id
    AND occurrence.tenant_id = p_tenant_id
    AND occurrence.status <> 'cancelled';

  IF assigned_teacher IS DISTINCT FROM p_teacher_id THEN
    RETURN jsonb_build_object('status', 'not_assigned');
  END IF;
  IF occurrence_date > current_date THEN
    RETURN jsonb_build_object('status', 'future_occurrence');
  END IF;

  INSERT INTO public.teacher_attendance (
    tenant_id, occurrence_id, teacher_id, status, marked_by, marked_at,
    approval_status, reviewed_by, reviewed_at, review_note, deleted_at
  ) VALUES (
    p_tenant_id, p_occurrence_id, p_teacher_id, p_status, p_profile_id, now(),
    'pending', NULL, NULL, NULL, NULL
  )
  ON CONFLICT (occurrence_id, teacher_id) DO UPDATE SET
    status = excluded.status,
    marked_by = excluded.marked_by,
    marked_at = now(),
    approval_status = 'pending',
    reviewed_by = NULL,
    reviewed_at = NULL,
    review_note = NULL,
    deleted_at = NULL
  WHERE public.teacher_attendance.approval_status <> 'approved'
  RETURNING id INTO attendance_id;

  IF attendance_id IS NULL THEN
    RETURN jsonb_build_object('status', 'already_approved');
  END IF;

  UPDATE public.session_occurrences SET status = 'done', updated_at = now()
  WHERE id = p_occurrence_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('status', 'pending', 'attendance_id', attendance_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_teacher_attendance(
  p_tenant_id uuid,
  p_profile_id uuid,
  p_attendance_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  updated_id uuid;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('status', 'invalid_decision');
  END IF;
  IF p_decision = 'rejected' AND nullif(btrim(p_note), '') IS NULL THEN
    RETURN jsonb_build_object('status', 'note_required');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_profile_id AND tenant_id = p_tenant_id AND role = 'principal'
  ) THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  UPDATE public.teacher_attendance SET
    approval_status = p_decision,
    reviewed_by = p_profile_id,
    reviewed_at = now(),
    review_note = nullif(btrim(p_note), '')
  WHERE id = p_attendance_id AND tenant_id = p_tenant_id
    AND approval_status = 'pending' AND deleted_at IS NULL
  RETURNING id INTO updated_id;

  RETURN jsonb_build_object(
    'status', CASE WHEN updated_id IS NULL THEN 'not_pending' ELSE p_decision END,
    'attendance_id', updated_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_session_occurrences(uuid, date) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_future_session_occurrences(date) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_own_teacher_attendance(uuid, uuid, uuid, uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_teacher_attendance(uuid, uuid, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_session_occurrences(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_future_session_occurrences(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_own_teacher_attendance(uuid, uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_teacher_attendance(uuid, uuid, uuid, text, text) TO service_role;
