CREATE OR REPLACE FUNCTION public.resolve_credential(p_tenant uuid, p_provider text, p_allow_sandbox boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.credentials
   WHERE tenant_id = p_tenant AND scope = 'tenant'
     AND provider = p_provider AND purpose = 'school_send'
     AND is_active = true
   ORDER BY CASE WHEN environment = 'production' THEN 0 ELSE 1 END
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF (SELECT environment FROM public.credentials WHERE id = v_id) = 'sandbox' AND p_allow_sandbox = false THEN
    RETURN NULL;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_credential(uuid, text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_credential(uuid, text, boolean) TO service_role;
