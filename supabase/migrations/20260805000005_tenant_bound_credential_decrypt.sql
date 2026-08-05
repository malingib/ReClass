-- Service workers must not depend on transaction-local tenant context when
-- resolving a tenant credential. Bind the tenant directly in the RPC instead.
CREATE OR REPLACE FUNCTION public.decrypt_tenant_credential(p_id uuid, p_tenant uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_blob text;
  v_kek text;
BEGIN
  SELECT encrypted_blob INTO v_blob
    FROM public.credentials
   WHERE id = p_id
     AND tenant_id = p_tenant
     AND scope = 'tenant'
     AND purpose = 'school_send'
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credential_not_found' USING ERRCODE = '42501';
  END IF;

  SELECT decrypted_secret INTO v_kek
    FROM vault.decrypted_secrets
   WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN
    RAISE EXCEPTION 'kek_missing' USING ERRCODE = '55000';
  END IF;

  RETURN pgp_sym_decrypt(v_blob::bytea, v_kek)::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.decrypt_tenant_credential(uuid, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_tenant_credential(uuid, uuid)
  TO service_role;
