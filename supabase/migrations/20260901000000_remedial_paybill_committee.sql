-- ReClass committee + Safaricom-style PayBill operator governance.
-- Safaricom's public M-PESA guidance uses a maker-checker model: at least two
-- web operators are needed to initiate/finalize transactions, and approval
-- workflows may have up to five approval levels. This migration models those
-- controls without storing Safaricom credentials in ReClass.

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (
  role IN ('super_admin','school_admin','principal','teacher','bursar','parent','remedial_committee_member')
);

CREATE TABLE IF NOT EXISTS public.remedial_committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  committee_role text NOT NULL CHECK (committee_role IN ('member','initiator','approver','auditor')),
  active boolean NOT NULL DEFAULT true,
  appointed_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, committee_role)
);

CREATE TABLE IF NOT EXISTS public.remedial_paybill_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  committee_member_id uuid NOT NULL REFERENCES public.remedial_committee_members(id) ON DELETE CASCADE,
  operator_role text NOT NULL CHECK (operator_role IN ('initiator','approver','manager','auditor')),
  approval_level smallint CHECK (approval_level BETWEEN 1 AND 5),
  active boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, committee_member_id, operator_role, approval_level)
);

CREATE TABLE IF NOT EXISTS public.remedial_paybill_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  paybill_number text,
  account_prefix text,
  minimum_web_operators smallint NOT NULL DEFAULT 2 CHECK (minimum_web_operators >= 2),
  approval_levels smallint NOT NULL DEFAULT 1 CHECK (approval_levels BETWEEN 1 AND 5),
  maker_checker_required boolean NOT NULL DEFAULT true,
  initiator_may_approve_own_transaction boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_reclass_committee_tenant ON public.remedial_committee_members(tenant_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_reclass_paybill_ops_tenant ON public.remedial_paybill_operators(tenant_id) WHERE active = true;

CREATE OR REPLACE FUNCTION public.validate_remedial_paybill_operator(
  p_tenant_id uuid,
  p_committee_member_id uuid,
  p_operator_role text,
  p_approval_level smallint DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  member_tenant uuid;
  member_active boolean;
  configured_levels smallint;
BEGIN
  SELECT tenant_id, active INTO member_tenant, member_active
  FROM public.remedial_committee_members
  WHERE id = p_committee_member_id;

  IF member_tenant IS NULL OR member_tenant <> p_tenant_id OR NOT member_active THEN
    RAISE EXCEPTION 'Committee member is not active in this school';
  END IF;

  SELECT approval_levels INTO configured_levels
  FROM public.remedial_paybill_settings
  WHERE tenant_id = p_tenant_id;

  IF p_operator_role = 'approver' AND (p_approval_level IS NULL OR p_approval_level > COALESCE(configured_levels, 1)) THEN
    RAISE EXCEPTION 'Approver level is outside the configured PayBill approval workflow';
  END IF;

  IF p_operator_role <> 'approver' AND p_approval_level IS NOT NULL THEN
    RAISE EXCEPTION 'Only approvers may have an approval level';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remedial_paybill_governance_status(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH ops AS (
    SELECT DISTINCT committee_member_id
    FROM public.remedial_paybill_operators
    WHERE tenant_id = p_tenant_id AND active = true
  ),
  initiators AS (
    SELECT DISTINCT committee_member_id FROM public.remedial_paybill_operators
    WHERE tenant_id = p_tenant_id AND active = true AND operator_role IN ('initiator','manager')
  ),
  approvers AS (
    SELECT DISTINCT committee_member_id FROM public.remedial_paybill_operators
    WHERE tenant_id = p_tenant_id AND active = true AND operator_role IN ('approver','manager')
  ),
  levels AS (
    SELECT COUNT(DISTINCT approval_level) AS configured_levels
    FROM public.remedial_paybill_operators
    WHERE tenant_id = p_tenant_id AND active = true AND operator_role = 'approver' AND approval_level IS NOT NULL
  ),
  settings AS (
    SELECT * FROM public.remedial_paybill_settings WHERE tenant_id = p_tenant_id
  )
  SELECT jsonb_build_object(
    'operator_count', (SELECT COUNT(*) FROM ops),
    'initiator_count', (SELECT COUNT(*) FROM initiators),
    'approver_count', (SELECT COUNT(*) FROM approvers),
    'approval_levels_configured', COALESCE((SELECT configured_levels FROM levels), 0),
    'minimum_web_operators', COALESCE((SELECT minimum_web_operators FROM settings), 2),
    'required_approval_levels', COALESCE((SELECT approval_levels FROM settings), 1),
    'maker_checker_required', COALESCE((SELECT maker_checker_required FROM settings), true),
    'ready', (
      (SELECT COUNT(*) FROM ops) >= COALESCE((SELECT minimum_web_operators FROM settings), 2)
      AND (SELECT COUNT(*) FROM initiators) >= 1
      AND (SELECT COUNT(*) FROM approvers) >= 1
      AND COALESCE((SELECT configured_levels FROM levels), 0) >= COALESCE((SELECT approval_levels FROM settings), 1)
    )
  );
$$;
