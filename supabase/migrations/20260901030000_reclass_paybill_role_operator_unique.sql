CREATE UNIQUE INDEX IF NOT EXISTS uq_reclass_paybill_role_operator
ON public.remedial_paybill_operators(tenant_id, role_assignment_id, operator_role, approval_level)
WHERE role_assignment_id IS NOT NULL;
