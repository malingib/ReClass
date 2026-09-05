-- eShule SIS foundation, additive to the existing SIS tables.
-- IMPORTANT: sis_classes, sis_admissions and sis_enrollments remain the canonical
-- class/admission/enrollment tables. No parallel student identity is introduced.

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_date date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_certificate_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_no ON public.students(tenant_id, student_no) WHERE student_no IS NOT NULL AND deleted_at IS NULL;

-- Enrich the existing admissions table; workflow is application -> decision -> enrollment.
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS application_no text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS applicant_first_name text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS applicant_middle_name text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS applicant_last_name text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS guardian_relationship text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS guardian_phone text;
ALTER TABLE public.sis_admissions ADD COLUMN IF NOT EXISTS guardian_email text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sis_admissions_application_no ON public.sis_admissions(tenant_id, application_no) WHERE application_no IS NOT NULL;

-- Longitudinal student history: never replace an event with a current-state boolean.
CREATE TABLE IF NOT EXISTS public.student_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  enrollment_id uuid REFERENCES public.sis_enrollments(id),
  event_type text NOT NULL CHECK (event_type IN ('admitted','enrolled','progressed','transferred','withdrawn','expelled','graduated','archived','restored','other')),
  effective_on date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  notes text,
  actor_id uuid REFERENCES public.profiles(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_lifecycle_events_student ON public.student_lifecycle_events(tenant_id, student_id, effective_on DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), student_id uuid NOT NULL REFERENCES public.students(id),
  document_type text NOT NULL, document_name text NOT NULL, storage_path text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('required','received','verified','rejected')),
  uploaded_by uuid REFERENCES public.profiles(id), uploaded_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id), verified_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents(tenant_id, student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_graduations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), student_id uuid NOT NULL REFERENCES public.students(id),
  academic_year text NOT NULL, graduation_date date NOT NULL, cohort text,
  completion_status text NOT NULL DEFAULT 'completed' CHECK (completion_status IN ('completed','deferred','not_completed')),
  clearance_status text NOT NULL DEFAULT 'pending' CHECK (clearance_status IN ('pending','cleared','blocked')),
  certificate_reference text, approved_by uuid REFERENCES public.profiles(id), approved_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id, academic_year)
);

CREATE TABLE IF NOT EXISTS public.school_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  title text NOT NULL, description text,
  event_type text NOT NULL DEFAULT 'event' CHECK (event_type IN ('term','holiday','meeting','reclass','deadline','event','other')),
  starts_at timestamptz NOT NULL, ends_at timestamptz, all_day boolean NOT NULL DEFAULT false,
  location text, audience text NOT NULL DEFAULT 'school' CHECK (audience IN ('school','teachers','students','parents','admin')),
  created_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_school_calendar_events_time ON public.school_calendar_events(tenant_id, starts_at);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  subject_id uuid REFERENCES public.subjects(id), class_id uuid REFERENCES public.sis_classes(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  room text, status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','started','completed','cancelled','missed')), notes text,
  created_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_time ON public.lessons(tenant_id, teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_lessons_class_time ON public.lessons(tenant_id, class_id, starts_at);

CREATE TABLE IF NOT EXISTS public.teacher_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), teacher_id uuid REFERENCES public.teachers(id),
  title text NOT NULL, body text, reminder_type text NOT NULL DEFAULT 'general' CHECK (reminder_type IN ('lesson','attendance','meeting','reclass','deadline','announcement','general')),
  remind_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','dismissed','cancelled')),
  related_type text, related_id uuid, created_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_reminders_due ON public.teacher_reminders(tenant_id, remind_at, status);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['student_lifecycle_events','student_documents','student_graduations','school_calendar_events','lessons','teacher_reminders']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_isolation ON public.%I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid)', t, t);
  END LOOP;
END $$;

-- Backfill a first lifecycle event for existing students without overwriting history.
INSERT INTO public.student_lifecycle_events (tenant_id, student_id, event_type, effective_on, notes)
SELECT s.tenant_id, s.id, CASE WHEN s.status = 'active' THEN 'enrolled' ELSE 'archived' END, COALESCE(s.admission_date, s.created_at::date), 'Initial lifecycle event created by eShule SIS foundation.'
FROM public.students s
WHERE NOT EXISTS (SELECT 1 FROM public.student_lifecycle_events e WHERE e.tenant_id = s.tenant_id AND e.student_id = s.id);

-- Safe conversion of an approved admission into a student. No screening stage.
CREATE OR REPLACE FUNCTION public.admit_sis_application(p_tenant_id uuid, p_admission_id uuid, p_actor_id uuid, p_admission_no text, p_student_no text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE a public.sis_admissions%ROWTYPE; new_student uuid;
BEGIN
  SELECT * INTO a FROM public.sis_admissions WHERE id=p_admission_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;
  IF a.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Admission is not awaiting admission decision'; END IF;
  IF a.student_id IS NOT NULL THEN RAISE EXCEPTION 'Admission already linked to a student'; END IF;
  INSERT INTO public.students(tenant_id,admission_no,student_no,first_name,middle_name,last_name,date_of_birth,gender,admission_date,status,created_by)
  VALUES(p_tenant_id,p_admission_no,p_student_no,COALESCE(a.applicant_first_name,'Applicant'),a.applicant_middle_name,COALESCE(a.applicant_last_name,''),a.date_of_birth,a.gender,CURRENT_DATE,'active',p_actor_id)
  RETURNING id INTO new_student;
  UPDATE public.sis_admissions SET status='enrolled', admission_number=p_admission_no, student_id=new_student, admission_date=CURRENT_DATE, updated_at=now() WHERE id=a.id;
  INSERT INTO public.student_lifecycle_events(tenant_id,student_id,event_type,effective_on,actor_id,notes) VALUES(p_tenant_id,new_student,'admitted',CURRENT_DATE,p_actor_id,'Created from SIS admissions workflow.');
  RETURN new_student;
END;
$$;
