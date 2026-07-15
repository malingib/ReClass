-- ReClass Migration 20260713010004 — teacher attendance + payroll model
-- Implements the corrected domain: attendance tracks whether a TEACHER
-- delivered a remedial slot (session_occurrence). Payroll = count of
-- attended occurrences x a configurable per-session rate.

-- 1. Drop the orphaned student-keyed attendance table (its only consumers
--    were pages referencing non-existent session_plans/group_members and are
--    being rewritten to teacher_attendance). Defensive drops first.
DROP INDEX IF EXISTS public.idx_attendance_occ;
DROP INDEX IF EXISTS public.idx_attendance_student;
DROP TABLE IF EXISTS public.attendance;

-- 2. Encode the two-daily-slots rule on sessions.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS slot text DEFAULT 'morning'
  CHECK (slot IN ('morning','evening'));

-- 3. Configurable flat rate paid to a teacher per attended session (KES).
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS payroll_rate_per_session numeric(10,2) DEFAULT 0;

-- 4. Teacher attendance: did the assigned teacher deliver the slot?
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

-- 5. Payroll runs (weekly, per teacher).
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_occ ON public.teacher_attendance(occurrence_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON public.teacher_attendance(teacher_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_period ON public.payroll_runs(tenant_id, period_start, period_end);

-- RLS: tenant isolation
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.teacher_attendance
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.payroll_runs
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
