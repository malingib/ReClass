-- ============================================================================
-- ReClass Migration 0002 — credential resolution (PLANNING DRAFT)
-- Strict: tenant school_send prod -> tenant school_send sandbox -> CREDS_NOT_FOUND
-- NO platform_billing fallback. Returns only credential id + metadata (NOT secrets).
-- Secrets retrieved via decrypt_credential() inside an Edge Function with
-- service_role + correct app context.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_credential(
  p_tenant uuid,
  p_provider text,
  p_allow_sandbox boolean DEFAULT false
)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  -- 1. tenant production school_send
  SELECT id INTO v_id FROM public.credentials
   WHERE tenant_id = p_tenant AND purpose='school_send'
     AND provider = p_provider AND environment='production'
     AND is_active AND test_status='ok'
   LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  -- 2. tenant sandbox school_send (dev/test only)
  IF p_allow_sandbox THEN
    SELECT id INTO v_id FROM public.credentials
     WHERE tenant_id = p_tenant AND purpose='school_send'
       AND provider = p_provider AND environment='sandbox'
       AND is_active AND test_status='ok'
     LIMIT 1;
    IF FOUND THEN RETURN v_id; END IF;
  END IF;

  -- 3. NONE — hard fail. Never consult platform_billing.
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_credential(uuid,text,boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_credential(uuid,text,boolean) TO service_role;
