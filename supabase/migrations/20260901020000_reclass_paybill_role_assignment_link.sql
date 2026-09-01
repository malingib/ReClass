-- PayBill operator permissions belong to an assigned committee role holder.
-- Keep the legacy committee_member_id path for existing records, while new
-- assignments use the canonical role_assignment_id.
ALTER TABLE public.remedial_paybill_operators ALTER COLUMN committee_member_id DROP NOT NULL;
ALTER TABLE public.remedial_paybill_operators ADD COLUMN IF NOT EXISTS role_assignment_id uuid REFERENCES public.remedial_committee_role_assignments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_reclass_paybill_role_assignment ON public.remedial_paybill_operators(role_assignment_id) WHERE active = true;

CREATE OR REPLACE FUNCTION public.validate_reclass_paybill_role_operator(
  p_tenant_id uuid,
  p_role_assignment_id uuid,
  p_operator_role text,
  p_approval_level smallint DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE configured_levels smallint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.remedial_committee_role_assignments a
    JOIN public.remedial_committee_role_definitions r ON r.id = a.role_id
    JOIN public.user_roles ur ON ur.user_id = a.teacher_id AND ur.tenant_id = a.tenant_id AND ur.role = 'teacher'
    WHERE a.id = p_role_assignment_id AND a.tenant_id = p_tenant_id AND a.active = true AND r.active = true
  ) THEN RAISE EXCEPTION 'Committee role assignment is not active or the assignee is not a teacher'; END IF;

  SELECT approval_levels INTO configured_levels FROM public.remedial_paybill_settings WHERE tenant_id = p_tenant_id;
  IF p_operator_role = 'approver' AND (p_approval_level IS NULL OR p_approval_level > COALESCE(configured_levels, 1)) THEN
    RAISE EXCEPTION 'Approver level is outside the configured PayBill approval workflow';
  END IF;
  IF p_operator_role <> 'approver' AND p_approval_level IS NOT NULL THEN RAISE EXCEPTION 'Only approvers may have an approval level'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remedial_paybill_governance_status(p_tenant_id uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  WITH ops AS (SELECT DISTINCT COALESCE(role_assignment_id::text, committee_member_id::text) holder FROM public.remedial_paybill_operators WHERE tenant_id=p_tenant_id AND active),
  initiators AS (SELECT DISTINCT COALESCE(role_assignment_id::text, committee_member_id::text) holder FROM public.remedial_paybill_operators WHERE tenant_id=p_tenant_id AND active AND operator_role IN ('initiator','manager')),
  approvers AS (SELECT DISTINCT COALESCE(role_assignment_id::text, committee_member_id::text) holder FROM public.remedial_paybill_operators WHERE tenant_id=p_tenant_id AND active AND operator_role IN ('approver','manager')),
  levels AS (SELECT COUNT(DISTINCT approval_level) configured_levels FROM public.remedial_paybill_operators WHERE tenant_id=p_tenant_id AND active AND operator_role='approver' AND approval_level IS NOT NULL),
  settings AS (SELECT * FROM public.remedial_paybill_settings WHERE tenant_id=p_tenant_id)
  SELECT jsonb_build_object('operator_count',(SELECT COUNT(*) FROM ops),'initiator_count',(SELECT COUNT(*) FROM initiators),'approver_count',(SELECT COUNT(*) FROM approvers),'approval_levels_configured',COALESCE((SELECT configured_levels FROM levels),0),'minimum_web_operators',COALESCE((SELECT minimum_web_operators FROM settings),2),'required_approval_levels',COALESCE((SELECT approval_levels FROM settings),1),'maker_checker_required',COALESCE((SELECT maker_checker_required FROM settings),true),'ready',((SELECT COUNT(*) FROM ops)>=COALESCE((SELECT minimum_web_operators FROM settings),2) AND (SELECT COUNT(*) FROM initiators)>=1 AND (SELECT COUNT(*) FROM approvers)>=1 AND COALESCE((SELECT configured_levels FROM levels),0)>=COALESCE((SELECT approval_levels FROM settings),1)));
$$;
