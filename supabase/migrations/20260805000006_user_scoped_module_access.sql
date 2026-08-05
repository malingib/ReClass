-- Tenant module visibility is safe for authenticated users who hold a role in
-- that tenant. Writes remain privileged and are not granted by this policy.
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_modules_member_read ON public.tenant_modules;
CREATE POLICY tenant_modules_member_read ON public.tenant_modules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND ur.tenant_id = tenant_modules.tenant_id
  ));
