# Secrets Inventory — Phase 0 Baseline (2026-08)

> PROSE ONLY. No secret VALUES are recorded anywhere in this pack. Names and
> locations are listed so the audit can verify each secret's storage, rotation,
> and exposure surface. The live Supabase Management API was UNREACHABLE at
> capture time (see BASELINE-2026-08.md), so the "Live Vault" column below
> reflects what the repo DECLARES via migrations/functions, not what was
> confirmed in the dashboard.

## 1. Source-of-truth credential stores

- **Supabase CLI credential store** — `~/.config/supabase/credentials.json`
  Holds a management `token` (length 44, `sbp_` prefix) and a `projectId`.
  At capture time this token returns HTTP 401 "Unauthorized" — it is EXPIRED /
  no longer valid. NOT written to any file in this pack; only its existence and
  prefix are noted.
- **Project `.env`** (gitignored — confirmed ignored via `git check-ignore`) —
  holds runtime keys for local/dev. Gitignored, so values are NOT in version
  control. Key NAMES present:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `IMPERSONATION_SECRET` (HMAC secret for super-admin impersonation cookies)
- **`.env.example` / `.env.production.example`** — template copies with
  placeholder values only (`<anon_key>`, `<service_role_key>`, etc.). No real
  secrets. Documented key names:
  - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side, must not be public)
  - `SECRET_KEY` (session encryption, openssl rand -base64 32)
  - `IMPERSONATION_SECRET`
  - `SENTRY_DSN`, `PUBLIC_SENTRY_DSN` (optional error tracking)

## 2. Supabase Vault secrets (declared by migrations / cron-config)

The repo references the following Vault secret NAMES (values stored encrypted
in Vault at runtime, not in this pack):

- `service_role_key` — service-role key used by pg_cron to invoke edge functions
- `notify_function_url` — URL of the `notify` edge function
- `mpesa_callback_function_url` — M-Pesa callback function URL
- `stk_function_url` — STK push function URL
- `credentials_test_function_url` — credentials-test function URL
- `payment_reminders_function_url` — referenced in migrations but NO matching
  `payment_reminders` function directory exists (see gaps)
- `reclass_kek` — likely a Key-Encryption-Key for credential decryption
  (tenant-bound credential decrypt migration references this)

## 3. Third-party / external secrets (by name, no values)

- **M-Pesa Daraja** credentials (Consumer Key / Secret, Shortcode, Passkey,
  Callback URL) — referenced by `supabase/functions/mpesa-callback` and `stk`.
  Stored in Vault per the credential-resolution design.
- **Mobiwave** SMS provider credentials — used by `notify` function to send
  queued SMS. Stored in Vault.
- **KCB** bank integration credentials — referenced by finance/reconciliation
  migrations (school-fees domain). Stored in Vault.

## 4. Exposure surface observations

- Runtime keys (`SUPABASE_SERVICE_ROLE_KEY`, `IMPERSONATION_SECRET`,
  `SECRET_KEY`) live in `.env` and Vault — not committed (`.env` is gitignored).
- The `service_role_key` secret is materialised into pg_cron SQL via
  `vault.decrypted_secrets` and used to call functions with full privileges —
  this is the highest-privilege secret in the system and should be rotation-
  monitored.
- `reclass_kek` (KEK) decrypts tenant credentials; its compromise would expose
  all tenant M-Pesa/bank credentials. Confirm it is itself wrapped/stored in
  Vault and access-logged.
