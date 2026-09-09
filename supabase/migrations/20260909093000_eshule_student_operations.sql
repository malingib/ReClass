-- eShule Phase: retention/history, graduation/exit, lesson management.
-- Admissions, enrollment and lifecycle remain on canonical SIS tables.

CREATE TABLE IF NOT EXISTS public.student_retention_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_year text NOT NULL,
  status text NOT NULL DEFAULT 'retained' CHECK (status IN ('retained','progressed','at_risk','exited')),
  reason text,
  follow_up_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_student_retention_tenant_year ON public.student_retention_records(tenant_id, academic_year, status);
ALTER TABLE public.student_retention_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.student_retention_records;
CREATE POLICY tenant_isolation ON public.student_retention_records USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.student_exit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  enrollment_id uuid REFERENCES public.sis_enrollments(id) ON DELETE RESTRICT,
  exit_type text NOT NULL CHECK (exit_type IN ('transferred','withdrawn','graduated','expelled','other')),
  exit_date date NOT NULL DEFAULT CURRENT_DATE,
  destination text,
  reason text,
  clearance_status text NOT NULL DEFAULT 'pending' CHECK (clearance_status IN ('pending','in_progress','cleared','waived')),
  certificate_reference text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_exit_tenant_date ON public.student_exit_records(tenant_id, exit_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_exit_student ON public.student_exit_records(tenant_id, student_id, exit_date DESC);
ALTER TABLE public.student_exit_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.student_exit_records;
CREATE POLICY tenant_isolation ON public.student_exit_records USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.graduation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  enrollment_id uuid REFERENCES public.sis_enrollments(id) ON DELETE RESTRICT,
  academic_year text NOT NULL,
  graduation_date date,
  completion_status text NOT NULL DEFAULT 'pending' CHECK (completion_status IN ('pending','complete','incomplete','deferred')),
  clearance_status text NOT NULL DEFAULT 'pending' CHECK (clearance_status IN ('pending','in_progress','cleared','waived')),
  certificate_reference text,
  approving_officer uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_graduation_tenant_year ON public.graduation_records(tenant_id, academic_year, completion_status);
ALTER TABLE public.graduation_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.graduation_records;
CREATE POLICY tenant_isolation ON public.graduation_records USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.sis_classes(id) ON DELETE RESTRICT,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  room text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_lessons_tenant_start ON public.lessons(tenant_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_start ON public.lessons(tenant_id, teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_lessons_class_start ON public.lessons(tenant_id, class_id, starts_at);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lessons;
CREATE POLICY tenant_isolation ON public.lessons USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE OR REPLACE FUNCTION public.touch_eshule_student_operations_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_student_retention_updated ON public.student_retention_records;
CREATE TRIGGER trg_student_retention_updated BEFORE UPDATE ON public.student_retention_records FOR EACH ROW EXECUTE FUNCTION public.touch_eshule_student_operations_updated_at();
DROP TRIGGER IF EXISTS trg_student_exit_updated ON public.student_exit_records;
CREATE TRIGGER trg_student_exit_updated BEFORE UPDATE ON public.student_exit_records FOR EACH ROW EXECUTE FUNCTION public.touch_eshule_student_operations_updated_at();
DROP TRIGGER IF EXISTS trg_graduation_updated ON public.graduation_records;
CREATE TRIGGER trg_graduation_updated BEFORE UPDATE ON public.graduation_records FOR EACH ROW EXECUTE FUNCTION public.touch_eshule_student_operations_updated_at();
DROP TRIGGER IF EXISTS trg_lessons_updated ON public.lessons;
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.touch_eshule_student_operations_updated_at();
