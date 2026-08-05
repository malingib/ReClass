-- SIS: Classes/Forms/Streams
CREATE TABLE IF NOT EXISTS public.sis_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  stream text,
  code text NOT NULL,
  academic_year text,
  homeroom_teacher_id uuid REFERENCES teachers(id),
  status text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- SIS: Admissions
CREATE TABLE IF NOT EXISTS public.sis_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  student_id uuid REFERENCES students(id),
  admission_number text NOT NULL,
  admission_date date DEFAULT CURRENT_DATE,
  grade_applied text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','enrolled')),
  previous_school text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, admission_number)
);

-- SIS: Enrollments
CREATE TABLE IF NOT EXISTS public.sis_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  student_id uuid NOT NULL REFERENCES students(id),
  class_id uuid NOT NULL REFERENCES sis_classes(id),
  academic_year text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active','completed','transferred','graduated')),
  enrolled_at date DEFAULT CURRENT_DATE,
  exited_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sis_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sis_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sis_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.sis_classes
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON public.sis_admissions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON public.sis_enrollments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS idx_sis_classes_tenant ON public.sis_classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sis_admissions_tenant ON public.sis_admissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sis_admissions_student ON public.sis_admissions(student_id);
CREATE INDEX IF NOT EXISTS idx_sis_enrollments_tenant ON public.sis_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sis_enrollments_student ON public.sis_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sis_enrollments_class ON public.sis_enrollments(class_id);

CREATE OR REPLACE FUNCTION public.set_sis_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sis_classes_updated_at BEFORE UPDATE ON public.sis_classes
  FOR EACH ROW EXECUTE FUNCTION public.set_sis_updated_at();
CREATE TRIGGER trg_sis_admissions_updated_at BEFORE UPDATE ON public.sis_admissions
  FOR EACH ROW EXECUTE FUNCTION public.set_sis_updated_at();
CREATE TRIGGER trg_sis_enrollments_updated_at BEFORE UPDATE ON public.sis_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_sis_updated_at();
