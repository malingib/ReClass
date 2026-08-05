-- Forward-compatibility: provide app.tenant_id() for environments that
-- already applied 20260722000006 or 20260722000007 with the undefined reference.
-- The preferred mechanism is current_setting('app.tenant_id', true)::uuid,
-- but this function allows older policies to resolve.
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$ SELECT current_setting('app.tenant_id', true)::uuid; $$;

REVOKE ALL ON FUNCTION app.tenant_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION app.tenant_id() TO authenticated, service_role;
