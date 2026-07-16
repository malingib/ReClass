-- ReClass Migration — Restore student attendance table (was incorrectly dropped in 20260713010004)
-- Teacher attendance and student attendance are separate concepts; both are needed.
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  occurrence_id uuid NOT NULL REFERENCES session_occurrences(id),
  student_id uuid NOT NULL REFERENCES students(id),
  status text NOT NULL CHECK (status IN ('present','late','absent','excused')),
  marked_by uuid REFERENCES profiles(id),
  marked_at timestamptz DEFAULT now(),
  locked boolean DEFAULT false,
  edit_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (occurrence_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_occ ON public.attendance(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_isolation ON public.attendance;
CREATE POLICY attendance_isolation ON public.attendance
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
