-- Committee roles are business roles (e.g. Chair, Secretary, Treasurer), not
-- permissions. Admin assigns an existing role to a teacher; PayBill rights are
-- an independent, additive layer.

CREATE TABLE IF NOT EXISTS public.remedial_committee_role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.remedial_committee_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.remedial_committee_role_definitions(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id),
  ended_at timestamptz,
  UNIQUE (tenant_id, role_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS public.remedial_committee_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.remedial_committee_role_assignments(id) ON DELETE CASCADE,
  right_code text NOT NULL CHECK (right_code IN (
    'view_committee','manage_members','initiate_payments','approve_payments',
    'approve_level_1','approve_level_2','approve_level_3','approve_level_4','approve_level_5',
    'view_payments','reconcile_payments','manage_paybill'
  )),
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, right_code)
);

CREATE INDEX IF NOT EXISTS idx_reclass_role_assignments_tenant ON public.remedial_committee_role_assignments(tenant_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_reclass_rights_assignment ON public.remedial_committee_rights(assignment_id) WHERE granted = true;

-- Backfill the existing generic committee membership into an additive role
-- assignment only when a matching role definition already exists. No new
-- business roles are invented by this migration.
INSERT INTO public.remedial_committee_role_definitions (tenant_id, name)
SELECT DISTINCT tenant_id, committee_role
FROM public.remedial_committee_members
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.remedial_committee_role_assignments (tenant_id, role_id, teacher_id)
SELECT m.tenant_id, r.id, m.user_id
FROM public.remedial_committee_members m
JOIN public.remedial_committee_role_definitions r
  ON r.tenant_id = m.tenant_id AND r.name = m.committee_role
ON CONFLICT (tenant_id, role_id, teacher_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_reclass_committee_role_assignment(
  p_tenant_id uuid,
  p_role_id uuid,
  p_teacher_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.remedial_committee_role_definitions
    WHERE id = p_role_id AND tenant_id = p_tenant_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Committee role is not active in this school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE tenant_id = p_tenant_id AND user_id = p_teacher_id AND role = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Only users with the teacher role can be assigned to the remedial committee';
  END IF;
END;
$$;
