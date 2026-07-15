-- ============================================================================
-- ReClass Migration 0001 — per-tenant credentials store (PLANNING DRAFT)
-- Status: NOT APPLIED.
-- Review, then copy to supabase/migrations/ and run ONLY after explicit
-- authorization against project rlswdeswlkuaigwtojxw.
-- ============================================================================

-- 0. PREREQ — create a KEK in Supabase Vault ONCE, manually, with a strong
--    random value (e.g. `openssl rand -base64 32`):
--      SELECT vault.create_secret('<32+ byte random base64>', 'reclass_kek', 'ReClass envelope KEK');
--    decrypt_credential()/encrypt_credential() read it at runtime via SECURITY DEFINER.
--    The KEK is NEVER in app env, never in client, never in this file.

-- 1. Table ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credentials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  scope         text NOT NULL CHECK (scope IN ('tenant','platform')),
  purpose       text NOT NULL CHECK (purpose IN ('school_send','platform_billing')),
  provider      text NOT NULL CHECK (provider IN ('mpesa','mobiwave_sms')),
  environment   text NOT NULL CHECK (environment IN ('sandbox','production')),
  label         text NOT NULL,
  encrypted_blob text NOT NULL,                      -- pgp_sym_encrypt(JSON secrets, KEK)
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid,
  last_tested_at timestamptz,
  test_status   text CHECK (test_status IN ('untested','ok','failed')) DEFAULT 'untested',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_scope_purpose_tenant CHECK (
    (scope='platform' AND purpose='platform_billing' AND tenant_id IS NULL)
    OR (scope='tenant' AND purpose='school_send' AND tenant_id IS NOT NULL)
  ),
  UNIQUE (tenant_id, provider, environment, scope)  -- one active cred per school+provider+env
);

COMMENT ON TABLE public.credentials IS
  'Per-tenant (school_send) and platform (platform_billing) secrets. '
  'school_send = a school''s OWN Daraja/Mobiwave account. '
  'platform_billing = Mobiwave''s OWN account for billing/ops only — NEVER a fallback for tenant sends.';

-- 2. updated_at trigger -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_credentials_updated ON public.credentials;
CREATE TRIGGER trg_credentials_updated BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Context setter (called per request by Edge Functions / API layer) -------
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant::text, true);
  PERFORM set_config('app.role', p_role, true);
END;
$$;

-- 4. decrypt_credential — SECURITY DEFINER; plaintext ONLY to authorized callers
CREATE OR REPLACE FUNCTION public.decrypt_credential(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row  public.credentials;
  v_kek  text;
  v_plain text;
BEGIN
  SELECT * INTO v_row FROM public.credentials WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- authorization: tenant sees its own; super_admin sees platform rows only
  IF v_row.scope = 'tenant' THEN
    IF current_setting('app.tenant_id', true) IS NULL
       OR v_row.tenant_id::text <> current_setting('app.tenant_id', true)
    THEN RAISE EXCEPTION 'credential access denied'; END IF;
  ELSIF v_row.scope = 'platform' THEN
    IF current_setting('app.role', true) <> 'super_admin'
    THEN RAISE EXCEPTION 'credential access denied'; END IF;
  END IF;

  SELECT decrypted_secret INTO v_kek FROM vault.decrypted_secrets WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN RAISE EXCEPTION 'kek missing'; END IF;

  v_plain := pgp_sym_decrypt(v_row.encrypted_blob::bytea, v_kek);
  RETURN v_plain::jsonb;
END;
$$;
-- Only service_role (Edge Functions) may decrypt; anon/authenticated never.
REVOKE ALL ON FUNCTION public.decrypt_credential(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credential(uuid) TO service_role;

-- 5. encrypt helper — keeps KEK access server-side when storing ---------------
CREATE OR REPLACE FUNCTION public.encrypt_credential(p_json jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_kek text;
BEGIN
  SELECT decrypted_secret INTO v_kek FROM vault.decrypted_secrets WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN RAISE EXCEPTION 'kek missing'; END IF;
  RETURN pgp_sym_encrypt(p_json::text, v_kek);
END;
$$;
REVOKE ALL ON FUNCTION public.encrypt_credential(jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_credential(jsonb) TO service_role;

-- 6. RLS --------------------------------------------------------------------
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cred_tenant ON public.credentials;
DROP POLICY IF EXISTS cred_platform ON public.credentials;

CREATE POLICY cred_tenant ON public.credentials
  FOR ALL
  USING (scope='tenant' AND tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (scope='tenant' AND tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY cred_platform ON public.credentials
  FOR ALL
  USING (scope='platform' AND current_setting('app.role') = 'super_admin')
  WITH CHECK (scope='platform' AND current_setting('app.role') = 'super_admin');

-- 7. Indexes -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_credentials_tenant ON public.credentials(tenant_id) WHERE scope='tenant';
CREATE INDEX IF NOT EXISTS idx_credentials_scope  ON public.credentials(scope, purpose);
