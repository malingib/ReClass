-- Standardize set_tenant_context to TRANSACTION-local scope.
--
-- Background: app code bypasses RLS via the service-role client and enforces
-- tenant isolation in the application layer (Proxy injects tenant_id into
-- locals.srv; RPCs filter by p_tenant_id). The RLS policies that read
-- current_setting('app.tenant_id') are defense-in-depth for Edge Functions and
-- direct anon-key access.
--
-- The older 20260713000001_credentials.sql definition set app.tenant_id with
-- set_config(..., true) which is SESSION-scoped. On a connection pooled/shared
-- between requests (Supabase pooler / transaction pooling), a session-scoped
-- setting leaks across requests: a tenant value set by one request could be
-- visible to a later request on the same physical connection, defeating
-- isolation for any path that does invoke set_tenant_context.
--
-- set_config(..., false) is TRANSACTION-local: it is cleared at the end of the
-- transaction and never bleeds across requests, which is the correct scope for
-- a per-request tenant context. We keep the canonical one-arg signature used by
-- the rest of the migration chain (20260720000004 / 20260720000006) and drop
-- the stale two-arg variant from 20260713000001.

DROP FUNCTION IF EXISTS public.set_tenant_context(p_tenant uuid, p_role text);

CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- transaction-local (false): never persists across requests on a pooled conn
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO service_role;
