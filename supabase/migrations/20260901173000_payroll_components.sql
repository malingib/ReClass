-- ReClass Migration 20260901173000 — payroll component model
-- A payroll run is the payment batch/header. Components are the auditable
-- earning lines so allowances, remedial work, committee work and role-specific
-- payments never have to be collapsed into one opaque amount.

-- The application already uses processing during B2C payout; the original
-- attendance/payroll migration only allowed draft/approved/paid.
ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_status_check;
ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_status_check
  CHECK (status IN ('draft','approved','processing','paid','failed','cancelled'));

CREATE TABLE IF NOT EXISTS public.payroll_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),

  -- base_salary = contractual salary; allowance = additional allowance;
  -- remedial = ReClass session compensation; committee = committee duty;
  -- role_specific = any named role/honorarium (e.g. Principal);
  -- adjustment = manually approved positive/negative adjustment.
  component_type text NOT NULL CHECK (component_type IN (
    'base_salary','allowance','remedial','committee','role_specific','adjustment'
  )),

  -- Optional role identity for role_specific/committee payments.
  role_code text,
  role_label text,

  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),

  -- Where the line came from: salary contract, attendance, committee duty,
  -- administrator entry, etc. Kept as auditable metadata rather than hidden
  -- inside description text.
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payroll_components_run
  ON public.payroll_components(tenant_id, payroll_run_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_components_type
  ON public.payroll_components(tenant_id, component_type, created_at)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_components_role
  ON public.payroll_components(tenant_id, role_code)
  WHERE deleted_at IS NULL AND role_code IS NOT NULL;

ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.payroll_components
  USING (tenant_id = coalesce(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- A payroll line must belong to the same tenant and teacher as its payroll run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_components_tenant_id_id
  ON public.payroll_components(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_tenant_id_id
  ON public.payroll_runs(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teachers_tenant_id_id
  ON public.teachers(tenant_id, id);

ALTER TABLE public.payroll_components
  DROP CONSTRAINT IF EXISTS payroll_components_run_tenant_fkey;
ALTER TABLE public.payroll_components
  ADD CONSTRAINT payroll_components_run_tenant_fkey
  FOREIGN KEY (tenant_id, payroll_run_id)
  REFERENCES public.payroll_runs(tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.payroll_components
  DROP CONSTRAINT IF EXISTS payroll_components_teacher_tenant_fkey;
ALTER TABLE public.payroll_components
  ADD CONSTRAINT payroll_components_teacher_tenant_fkey
  FOREIGN KEY (tenant_id, teacher_id)
  REFERENCES public.teachers(tenant_id, id);

-- Convenience view for finance screens and exports: one payroll run can show
-- exactly how the gross amount was assembled.
CREATE OR REPLACE VIEW public.payroll_run_component_summary AS
SELECT
  pr.tenant_id,
  pr.id AS payroll_run_id,
  pr.teacher_id,
  pc.component_type,
  pc.role_code,
  pc.role_label,
  SUM(pc.amount) AS component_total
FROM public.payroll_runs pr
JOIN public.payroll_components pc
  ON pc.payroll_run_id = pr.id
 AND pc.tenant_id = pr.tenant_id
 AND pc.deleted_at IS NULL
GROUP BY pr.tenant_id, pr.id, pr.teacher_id, pc.component_type, pc.role_code, pc.role_label;
