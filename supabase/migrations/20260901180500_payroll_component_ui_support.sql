-- ReClass Migration 20260901180500 — componentized payroll
-- A payroll run is a container; compensation lines explain how it was earned.

CREATE TABLE IF NOT EXISTS public.payroll_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  component_type text NOT NULL CHECK (component_type IN ('base_salary','allowance','remedial','committee','role_specific','adjustment')),
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  role_code text,
  role_label text,
  source_type text,
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_components_run ON public.payroll_components(tenant_id, payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_components_type ON public.payroll_components(tenant_id, component_type);

ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_components_select_tenant ON public.payroll_components
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY payroll_components_insert_treasurer ON public.payroll_components
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.has_capability('payroll:manage')
  );

CREATE POLICY payroll_components_update_treasurer ON public.payroll_components
  FOR UPDATE USING (
    tenant_id = public.get_current_tenant_id()
    AND public.has_capability('payroll:manage')
  ) WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.has_capability('payroll:manage')
  );

CREATE OR REPLACE FUNCTION public.add_payroll_component(
  p_payroll_run_id uuid,
  p_component_type text,
  p_description text,
  p_quantity numeric,
  p_rate numeric,
  p_amount numeric,
  p_role_code text DEFAULT NULL,
  p_role_label text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.payroll_components
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_run public.payroll_runs; v_component public.payroll_components;
BEGIN
  SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_payroll_run_id AND tenant_id = public.get_current_tenant_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll run not found'; END IF;
  IF v_run.status NOT IN ('draft','pending') THEN RAISE EXCEPTION 'Payroll run is not editable'; END IF;
  IF NOT public.has_capability('payroll:manage') THEN RAISE EXCEPTION 'Not authorized to manage payroll'; END IF;
  IF p_component_type IN ('committee','role_specific') AND (p_role_code IS NULL OR p_role_label IS NULL) THEN RAISE EXCEPTION 'Role is required for this payment type'; END IF;
  IF p_amount <> round(p_quantity * p_rate, 2) THEN RAISE EXCEPTION 'Amount must equal quantity multiplied by rate'; END IF;

  INSERT INTO public.payroll_components (tenant_id,payroll_run_id,teacher_id,component_type,description,quantity,rate,amount,role_code,role_label,source_type,source_id,metadata,created_by)
  VALUES (public.get_current_tenant_id(),v_run.id,v_run.teacher_id,p_component_type,p_description,p_quantity,p_rate,p_amount,p_role_code,p_role_label,p_source_type,p_source_id,p_metadata,auth.uid())
  RETURNING * INTO v_component;
  RETURN v_component;
END;
$$;

REVOKE ALL ON FUNCTION public.add_payroll_component(uuid,text,text,numeric,numeric,numeric,text,text,text,uuid,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_payroll_component(uuid,text,text,numeric,numeric,numeric,text,text,text,uuid,jsonb) TO authenticated, service_role;
