# Build artifacts (PLANNING DRAFT — NOT APPLIED)

These are pre-build drafts produced during the planning phase. **Nothing here has
been run against project `rlswdeswlkuaigwtojxw`.** Copy into `supabase/migrations/`
and apply only after explicit authorization.

## Apply order
1. `0001_credentials.sql` — `credentials` table, KEK-based encrypt/decrypt, RLS.
2. `0002_credential_resolution.sql` — `resolve_credential()` (strict, no fallback).
3. `0003_reconcile_payment.sql` — idempotent STK reconciliation.

## Manual prerequisite (one-time, do NOT script secrets)
Create the envelope KEK in Supabase Vault (run in the SQL editor or psql):
```sql
SELECT vault.create_secret(
  '<32+ byte random, e.g. base64 of `openssl rand -base64 32`>',
  'reclass_kek',
  'ReClass envelope KEK (AES-256-GCM)'
);
```
The KEK value is NEVER in these files and NEVER in app env.

## Edge Functions (deploy with `supabase functions deploy`)
- `edge-stk.ts` → `supabase/functions/stk/index.ts` (per-tenant STK Push)
- `edge-mpesa-callback.ts` → `supabase/functions/mpesa-callback/index.ts` (callback reconcile)
- `edge-notify.ts` → `supabase/functions/notify/index.ts` (Mobiwave SMS fan-out; SMS only)
- `edge-credentials-test.ts` → `supabase/functions/credentials-test/index.ts` (`/credentials/:id/test` validation)

Both use `service_role` only and call `resolve_credential()` / `decrypt_credential()`
SECURITY DEFINER. Plaintext secrets never leave the function scope.

## Security notes
- `decrypt_credential` / `encrypt_credential` / `resolve_credential` / `reconcile_payment`
  are `REVOKE`d from anon/authenticated and granted only to `service_role`.
- `mpesa-callback` is a public POST. Mitigations (see security.md §callback): reject
  unknown CheckoutRequestIDs, reconcile by amount+tenant, optionally whitelist Safaricom
  egress IPs at a Cloudflare Worker in front.
- `school_send` (tenant) vs `platform_billing` (super_admin own account, billing/ops only)
  enforced by CHECK constraint + RLS — never a tenant fallback.
