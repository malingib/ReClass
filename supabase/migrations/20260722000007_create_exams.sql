CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  term text,
  exam_date date,
  max_score numeric(5,2) NOT NULL DEFAULT 100,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_exams_tenant ON public.exams(tenant_id);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY exams_tenant_isolation ON public.exams
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  score numeric(5,2) NOT NULL CHECK (score >= 0),
  grade text,
  remarks text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);

CREATE INDEX idx_exam_results_exam ON public.exam_results(tenant_id, exam_id);
CREATE INDEX idx_exam_results_student ON public.exam_results(tenant_id, student_id);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_results_tenant_isolation ON public.exam_results
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
