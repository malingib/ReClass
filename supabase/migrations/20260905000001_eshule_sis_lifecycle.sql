-- eShule SIS + student lifecycle foundation.
-- Additive migration: preserves the existing students table and historical data.

CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, name),
  CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (academic_year_id, name),
  CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.year_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  code text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  year_group_id uuid NOT NULL REFERENCES public.year_groups(id),
  name text NOT NULL,
  capacity integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (year_group_id, name),
  CHECK (capacity IS NULL OR capacity > 0)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
  year_group_id uuid NOT NULL REFERENCES public.year_groups(id),
  stream_id uuid REFERENCES public.streams(id),
  enrolled_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','withdrawn','transferred','graduated')),
  exit_on date,
  exit_reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year_id),
  CHECK (exit_on IS NULL OR exit_on >= enrolled_on)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(tenant_id, student_id, enrolled_on DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON public.enrollments(tenant_id, academic_year_id, status);

CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  enrollment_id uuid REFERENCES public.enrollments(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  event_type text NOT NULL CHECK (event_type IN ('admitted','enrolled','progressed','transferred','withdrawn','expelled','graduated','archived','restored','other')),
  effective_on date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  notes text,
  actor_id uuid REFERENCES public.profiles(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_student ON public.lifecycle_events(tenant_id, student_id, effective_on DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  application_no text NOT NULL,
  applicant_first_name text NOT NULL,
  applicant_middle_name text,
  applicant_last_name text NOT NULL,
  date_of_birth date,
  gender text,
  phone text,
  email text,
  previous_school text,
  applying_for_year_group_id uuid REFERENCES public.year_groups(id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
  admission_no text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','admitted','rejected','withdrawn')),
  applied_on date NOT NULL DEFAULT CURRENT_DATE,
  decision_on date,
  decision_reason text,
  notes text,
  student_id uuid REFERENCES public.students(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, application_no)
);
CREATE INDEX IF NOT EXISTS idx_admissions_tenant_status ON public.admissions(tenant_id, status, applied_on DESC);

CREATE TABLE IF NOT EXISTS public.admission_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  admission_id uuid NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.parents(id),
  full_name text NOT NULL,
  relationship text,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admission_guardians_admission ON public.admission_guardians(tenant_id, admission_id);

CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  document_type text NOT NULL,
  document_name text NOT NULL,
  storage_path text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('required','received','verified','rejected')),
  uploaded_by uuid REFERENCES public.profiles(id),
  uploaded_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents(tenant_id, student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.graduations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
  graduation_date date NOT NULL,
  cohort text,
  completion_status text NOT NULL DEFAULT 'completed' CHECK (completion_status IN ('completed','deferred','not_completed')),
  clearance_status text NOT NULL DEFAULT 'pending' CHECK (clearance_status IN ('pending','cleared','blocked')),
  certificate_reference text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS public.school_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  term_id uuid REFERENCES public.terms(id),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'event' CHECK (event_type IN ('term','holiday','meeting','exam','reclass','deadline','event','other')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  audience text NOT NULL DEFAULT 'school' CHECK (audience IN ('school','teachers','students','parents','admin')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_time ON public.school_calendar_events(tenant_id, starts_at);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  term_id uuid REFERENCES public.terms(id),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  subject_id uuid REFERENCES public.subjects(id),
  year_group_id uuid REFERENCES public.year_groups(id),
  stream_id uuid REFERENCES public.streams(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  room text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','started','completed','cancelled','missed')),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_time ON public.lessons(tenant_id, teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_lessons_class_time ON public.lessons(tenant_id, year_group_id, stream_id, starts_at);

CREATE TABLE IF NOT EXISTS public.teacher_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  teacher_id uuid REFERENCES public.teachers(id),
  title text NOT NULL,
  body text,
  reminder_type text NOT NULL DEFAULT 'general' CHECK (reminder_type IN ('lesson','attendance','meeting','reclass','deadline','announcement','general')),
  remind_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','dismissed','cancelled')),
  related_type text,
  related_id uuid,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_reminders_due ON public.teacher_reminders(tenant_id, remind_at, status);

-- Additive student master fields. Existing admission_no remains the stable school-facing identifier.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_date date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_certificate_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_no ON public.students(tenant_id, student_no) WHERE student_no IS NOT NULL AND deleted_at IS NULL;

-- Preserve existing records while giving them a first lifecycle event when the migration runs.
INSERT INTO public.lifecycle_events (tenant_id, student_id, event_type, effective_on, notes)
SELECT s.tenant_id, s.id, 'enrolled', COALESCE(s.admission_date, s.created_at::date), 'Initial lifecycle event created during SIS foundation migration.'
FROM public.students s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.lifecycle_events e WHERE e.student_id = s.id AND e.tenant_id = s.tenant_id
  );

-- Tenant isolation follows the application's existing app.tenant_id RLS convention.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['academic_years','terms','year_groups','streams','enrollments','lifecycle_events','admissions','admission_guardians','student_documents','graduations','school_calendar_events','lessons','teacher_reminders']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_isolation ON public.%I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid)', t, t);
  END LOOP;
END $$;

-- Admission -> student -> enrollment is transactional and intentionally contains no screening stage.
CREATE OR REPLACE FUNCTION public.admit_application(
  p_tenant_id uuid,
  p_admission_id uuid,
  p_actor_id uuid,
  p_admission_no text,
  p_student_no text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE a public.admissions%ROWTYPE;
DECLARE new_student uuid;
BEGIN
  SELECT * INTO a FROM public.admissions
  WHERE id = p_admission_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'Only pending admissions can be admitted'; END IF;
  IF a.student_id IS NOT NULL THEN RAISE EXCEPTION 'Admission already linked to a student'; END IF;

  INSERT INTO public.students (
    tenant_id, admission_no, student_no, first_name, middle_name, last_name,
    date_of_birth, gender, admission_date, status, created_by
  ) VALUES (
    p_tenant_id, p_admission_no, p_student_no, a.applicant_first_name, a.applicant_middle_name,
    a.applicant_last_name, a.date_of_birth, a.gender, CURRENT_DATE, 'active', p_actor_id
  ) RETURNING id INTO new_student;

  UPDATE public.admissions
  SET status = 'admitted', decision_on = CURRENT_DATE, admission_no = p_admission_no,
      student_id = new_student, updated_at = now()
  WHERE id = a.id;

  INSERT INTO public.lifecycle_events (tenant_id, student_id, event_type, effective_on, actor_id, notes)
  VALUES (p_tenant_id, new_student, 'admitted', CURRENT_DATE, p_actor_id, 'Created from admissions workflow.');

  RETURN new_student;
END;
$$;
