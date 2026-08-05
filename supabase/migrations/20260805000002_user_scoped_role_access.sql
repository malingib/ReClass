-- Allow the authenticated user to read only their own role rows. This is
-- intentionally additive: privileged tenant administration remains separate.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;
CREATE POLICY user_roles_self_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
