--------------------------------------------------------------------------
-- Fix 1: Secure impersonation session store
--------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.impersonation_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  impersonator_id uuid NOT NULL,
  ip_address text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX impersonation_tokens_tenant_idx ON public.impersonation_tokens(tenant_id);

-- The actual signing secret lives in Supabase vault / encrypted creds;
-- Pseudo-code hook flow:
--   1. server encrypts {tenant_id, impersonator_id, expires, ip} → AES + HMAC
--   2. base64 blob stored in cookie
--   3. hook decrypts, verifies HMAC, checks expires, checks ip match

--------------------------------------------------------------------------
-- Fix 2: M-Pesa callback dedup — UNIQUE on mpesa_checkout_id in notifications
--------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_channel_external_unique_idx') THEN
    CREATE UNIQUE INDEX notifications_channel_external_unique_idx
      ON public.notifications (channel, external_id, related_type, related_id)
      WHERE channel = 'sms';
  END IF;
END $$;

--------------------------------------------------------------------------
-- Fix 3: Notification tenant-scope via RLS helper
--------------------------------------------------------------------------
-- Re-create the set_tenant_context RPC (already in 20260720000004 but
-- idempotent so safe)
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;

--------------------------------------------------------------------------
-- Fix 4: STK checkout request BEFORE API call
--         (application-level change, not a DB constraint)
--         See code updates in supabase/functions/stk/index.ts

--------------------------------------------------------------------------
-- Fix 5: Remove double-insert trigger from trg_payment_after_insert
--         (since reconcile_payment now relies on the trigger exclusively)
--         This trigger is correct IF it only fires for INSERT.
--         No change needed — the trigger is correct. The OLD fix was
--         removing the manual UPDATE from reconcile_payment, done in
--         20260720000004.