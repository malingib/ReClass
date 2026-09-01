-- ReClass Migration 20260901174000 — controlled payroll component API

CREATE OR REPLACE FUNCTION public.add_payroll_component(
  p_tenant_id uuid,
  p_payroll_run_id uuid,
  p_teacher_id uuid,
  p_component_type text,
  p_description text,
  p_amount numeric,
  p_quantity numeric DEFAULT 1,
  p_rate numeric DEFAULT 0,
  p_role_code text DEFAULT NULL,
  p_role_label text DEFAULT NULL,
  p_source_type text DEFAULT 'manual',
  p_source_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_component_type NOT IN ('base_salary','allowance','remedial','committee','role_specific','adjustment') THEN
    RAISE EXCEPTION 'Invalid payroll component type';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Amount must be non-negative'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF p_rate IS NULL OR p_rate < 0 THEN RAISE EXCEPTION 'Rate must be non-negative'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM payroll_runs
    WHERE id=p_payroll_run_id AND tenant_id=p_tenant_id AND teacher_id=p_teacher_id
      AND status='draft' AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Payroll run not found, not tenant-owned, or no longer editable';
  END IF;

  IF p_component_type IN ('committee','role_specific') AND NULLIF(trim(p_role_code),'') IS NULL THEN
    RAISE EXCEPTION 'Role code is required for committee and role-specific payments';
  END IF;

  INSERT INTO payroll_components(
    tenant_id,payroll_run_id,teacher_id,component_type,role_code,role_label,
    description,quantity,rate,amount,source_type,source_id,metadata
  ) VALUES (
    p_tenant_id,p_payroll_run_id,p_teacher_id,p_component_type,p_role_code,p_role_label,
    p_description,p_quantity,p_rate,p_amount,p_source_type,p_source_id,coalesce(p_metadata,'{}'::jsonb)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_payroll_component(uuid,uuid,uuid,text,text,numeric,numeric,numeric,text,text,text,uuid,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_payroll_component(uuid,uuid,uuid,text,text,numeric,numeric,numeric,text,text,text,uuid,jsonb) TO service_role;
