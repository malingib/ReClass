-- ============================================================
-- ReClass — Missing Tables Migration (consolidated)
-- Apply this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. group_members: links students to remedial groups
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  student_id uuid NOT NULL REFERENCES students(id),
  group_id uuid NOT NULL REFERENCES remedial_groups(id),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE (student_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_members_isolation ON public.group_members;
CREATE POLICY group_members_isolation ON public.group_members
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 2. teacher_attendance: tracks teacher delivery of remedial sessions
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  occurrence_id uuid NOT NULL REFERENCES session_occurrences(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  status text NOT NULL CHECK (status IN ('present','late','absent','excused')),
  marked_by uuid REFERENCES profiles(id),
  marked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (occurrence_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_occ ON public.teacher_attendance(occurrence_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON public.teacher_attendance(teacher_id) WHERE deleted_at IS NULL;

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_attendance_isolation ON public.teacher_attendance;
CREATE POLICY teacher_attendance_isolation ON public.teacher_attendance
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 3. payroll_runs (optional: for teacher stipends)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  occurrences_count int NOT NULL DEFAULT 0,
  rate_per_session numeric(10,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payroll_tenant_period ON public.payroll_runs(tenant_id, period_start, period_end);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_isolation ON public.payroll_runs;
CREATE POLICY payroll_isolation ON public.payroll_runs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 4. Seed group_members from existing enrollments
INSERT INTO public.group_members (tenant_id, student_id, group_id)
SELECT
  s.tenant_id,
  s.id AS student_id,
  g.id AS group_id
FROM public.students s
CROSS JOIN public.remedial_groups g
WHERE s.tenant_id = g.tenant_id
  AND s.grade = 'Form 4'
  AND g.name ILIKE '%Form 4%'
ON CONFLICT (student_id, group_id) DO NOTHING;
