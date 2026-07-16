-- ReClass Migration 20260716000001 — group_members join table
-- Links students to remedial_groups for enrollment tracking.
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
