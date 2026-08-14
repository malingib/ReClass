-- ==========================================================================
-- eShule platform config: secrets owned by the platform admin (2026-08-12)
-- ==========================================================================
-- Platform-wide operational settings that edge functions depend on:
--   - mpesa_callback_secret  (shared callback header secret: mpesa-callback,
--                             b2c-result fail closed on this)
--   - public_url             (base URL used to build callback endpoints)
-- Stored encrypted at rest (pgp via vault.reclass_kek, same as credentials)
-- and managed by the SUPER_ADMIN dashboard (Platform Settings), never by
-- tenant users. Edge functions read them through get_platform_config() and
-- fall back to their Deno env so pre-existing environments keep working.
-- ==========================================================================

-- ── 1. platform_config table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL,
  value_encrypted TEXT,
  comment         TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID,
  UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_platform_config_key ON public.platform_config(key);

DROP TRIGGER IF EXISTS trg_platform_config_updated ON public.platform_config;
CREATE TRIGGER trg_platform_config_updated BEFORE UPDATE ON public.platform_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Only super_admin's session may touch platform config rows.
DROP POLICY IF EXISTS platform_config_super_admin ON public.platform_config;
CREATE POLICY platform_config_super_admin ON public.platform_config
  FOR ALL
  USING (current_setting('app.role', true) = 'super_admin')
  WITH CHECK (current_setting('app.role', true) = 'super_admin');

-- ── 2. get_platform_config: decrypt + return all values, service-role only ─
CREATE OR REPLACE FUNCTION public.get_platform_config()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kek text;
  v_out jsonb := '{}'::jsonb;
BEGIN
  SELECT decrypted_secret INTO v_kek FROM vault.decrypted_secrets WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN RAISE EXCEPTION 'kek missing'; END IF;

  SELECT jsonb_object_agg(
    key,
    pgp_sym_decrypt(value_encrypted, v_kek)
  ) INTO v_out
  FROM public.platform_config
  WHERE value_encrypted IS NOT NULL;

  RETURN COALESCE(v_out, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_config() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_config() TO service_role;

-- ── 3. set_platform_config: upsert a single (encrypted) key ───────────────
CREATE OR REPLACE FUNCTION public.set_platform_config(
  p_key text,
  p_value text,
  p_updated_by uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kek text;
  v_encrypted text;
BEGIN
  IF p_key IS NULL OR p_key = '' THEN
    RETURN jsonb_build_object('status', 'invalid_key');
  END IF;

  SELECT decrypted_secret INTO v_kek FROM vault.decrypted_secrets WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN RAISE EXCEPTION 'kek missing'; END IF;

  v_encrypted := pgp_sym_encrypt(p_value, v_kek);

  IF EXISTS (SELECT 1 FROM public.platform_config WHERE key = p_key) THEN
    UPDATE public.platform_config
      SET value_encrypted = v_encrypted, updated_at = now(), updated_by = p_updated_by
      WHERE key = p_key;
  ELSE
    INSERT INTO public.platform_config (key, value_encrypted, updated_by)
      VALUES (p_key, v_encrypted, p_updated_by);
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'key', p_key);
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_config(text, text, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_config(text, text, uuid)
  TO service_role;

-- ── 4. decrypt_platform_credential: platform-scope decrypt for edge fns ───
-- Cleaner than routing through set_tenant_context + decrypt_credential across
-- two PostgREST requests (session config never persists between them).
-- Intended for super_admin flows only; the CALLER (edge fn / dashboard) is
-- responsible for verifying the operator is a super_admin.
CREATE OR REPLACE FUNCTION public.decrypt_platform_credential(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.credentials;
  v_kek text;
  v_plain text;
BEGIN
  SELECT * INTO v_row FROM public.credentials WHERE id = p_id AND scope = 'platform';
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT decrypted_secret INTO v_kek FROM vault.decrypted_secrets WHERE name = 'reclass_kek';
  IF v_kek IS NULL THEN RAISE EXCEPTION 'kek missing'; END IF;

  v_plain := pgp_sym_decrypt(v_row.encrypted_blob::bytea, v_kek);
  RETURN v_plain::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.decrypt_platform_credential(uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_platform_credential(uuid) TO service_role;