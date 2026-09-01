-- ReClass Migration 20260901173500 — component payment allocation
-- A single B2C payout may settle a payroll run, but finance must still be able
-- to explain how the paid amount was composed.

CREATE TABLE IF NOT EXISTS public.payroll_component_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  payroll_component_id uuid NOT NULL REFERENCES public.payroll_components(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  provider text,
  provider_reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_component_payments_run
  ON public.payroll_component_payments(tenant_id, payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_component_payments_component
  ON public.payroll_component_payments(tenant_id, payroll_component_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_component_payment_provider_ref
  ON public.payroll_component_payments(tenant_id, provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

ALTER TABLE public.payroll_component_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.payroll_component_payments
  USING (tenant_id = coalesce(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_component_payments_tenant_id_id
  ON public.payroll_component_payments(tenant_id, id);

ALTER TABLE public.payroll_component_payments
  DROP CONSTRAINT IF EXISTS payroll_component_payments_run_tenant_fkey;
ALTER TABLE public.payroll_component_payments
  ADD CONSTRAINT payroll_component_payments_run_tenant_fkey
  FOREIGN KEY (tenant_id, payroll_run_id)
  REFERENCES public.payroll_runs(tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.payroll_component_payments
  DROP CONSTRAINT IF EXISTS payroll_component_payments_component_tenant_fkey;
ALTER TABLE public.payroll_component_payments
  ADD CONSTRAINT payroll_component_payments_component_tenant_fkey
  FOREIGN KEY (tenant_id, payroll_component_id)
  REFERENCES public.payroll_components(tenant_id, id)
  ON DELETE RESTRICT;

CREATE OR REPLACE VIEW public.payroll_component_payment_summary AS
SELECT
  pc.tenant_id,
  pc.payroll_run_id,
  pc.id AS payroll_component_id,
  pc.component_type,
  pc.role_code,
  pc.role_label,
  pc.description,
  pc.amount AS component_amount,
  COALESCE(SUM(pp.amount), 0) AS paid_amount,
  pc.amount - COALESCE(SUM(pp.amount), 0) AS outstanding_amount
FROM public.payroll_components pc
LEFT JOIN public.payroll_component_payments pp
  ON pp.payroll_component_id = pc.id
 AND pp.tenant_id = pc.tenant_id
WHERE pc.deleted_at IS NULL
GROUP BY pc.tenant_id, pc.payroll_run_id, pc.id, pc.component_type, pc.role_code, pc.role_label, pc.description, pc.amount;
