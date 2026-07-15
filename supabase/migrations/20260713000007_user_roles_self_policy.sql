-- Allow authenticated users to read their own user_roles row (bypasses tenant_id check)
-- This is needed during login flow when app.tenant_id is not yet set
DROP POLICY IF EXISTS user_roles_self ON public.user_roles;
CREATE POLICY user_roles_self ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());
