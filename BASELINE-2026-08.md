# BASELINE-2026-08 — Phase 0 (Contain & Baseline) Capture Pack

**Captured:** 2026-08-13 (local repo `/home/malingi/Projects/Custom/ReClass`,
live project ref `rlswdeswlkuaigwtojxw`, linked as "ReClass")
**CLI:** supabase 2.84.2 (note: v2.114.0 is current — CLI is behind)
**Status:** PARTIAL — live Management-API evidence BLOCKED (auth token expired).

---

## 1. State at capture time

| Item | Value | Source |
|------|-------|--------|
| Live project ref | `rlswdeswlkuaigwtojxw` | `supabase/.temp/linked-project.json` |
| Linked org | `ywcgqiftkaxnffvfxzst` | same |
| Migrations (local) | **66** | `supabase/migrations/*.sql` |
| Edge functions (declared) | `b2c`, `b2c-result`, `credentials-test`, `mpesa-callback`, `notify`, `stk` (6) | `supabase/functions/*` |
| Cron | pg_cron self-invoke of `notify` every 2 min | `supabase/functions/notify/cron-config.md` |
| CLI version | 2.84.2 | `supabase --version` |
| Node (build) | v22.22.2 | repo toolchain |
| Latest repo commit | `c965c40 feat: reconcile design system + close audit action plan` | `git log` |
| `.env` tracked? | NO — gitignored (confirmed via `git check-ignore`) | `.gitignore` |

---

## 2. Live Management-API evidence — BLOCKED

The following were requested from `api.supabase.com/v1/...` but could NOT be
captured:

- `project.json` (project config — would include DB version, PITR, region)
- `functions.json` (edge function list + versions)
- `keys.json` (API keys)
- `branches.json` (branch list)
- raw migration status

**Why:** the only available Supabase management token
(`~/.config/supabase/credentials.json`, prefix `sbp_be98…`, len 44) returns
**HTTP 401 "Unauthorized"** on both a raw `curl` call and `supabase projects
list`. The token is **expired / revoked**. It was never written to any file in
this pack.

The prior async subagent failed for the same reason but only checked env vars
and shell rc files — it missed the credential-store location, so it never
confirmed whether *a* token existed. This capture confirms one exists but is
dead.

> The stub files from the prior run (`project.json`, `functions.json`,
> `keys.json`, `branches.json`, `_migrations_raw.json`) contained only empty
> `{"_error":""}` or `{"message":"JWT could not be decoded"}` and have been
> renamed to `*.blocked` to mark them as uncollected.

---

## 3. Secrets inventory summary (names only — no values)

Full prose in `docs/baseline-2026-08/secrets-inventory.md`. Summary:

- **CLI store:** `~/.config/supabase/credentials.json` (EXPIRED management token)
- **Runtime (`.env`, gitignored):** `PUBLIC_SUPABASE_URL`,
  `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `IMPERSONATION_SECRET`
- **Vault secrets (declared):** `service_role_key`, `notify_function_url`,
  `mpesa_callback_function_url`, `stk_function_url`,
  `credentials_test_function_url`, `payment_reminders_function_url`, `reclass_kek`
- **External:** M-Pesa Daraja, Mobiwave SMS, KCB bank credentials

Highest-privilege: `service_role_key` (used by pg_cron) and `reclass_kek`
(KEK decrypting all tenant credentials).

---

## 4. Cron configuration found

- `notify` function self-invokes every 2 minutes via `pg_cron` + `pg_net`
  (per `notify/cron-config.md`). Requires extensions `pg_cron`, `pg_net`.
- `cron_schedules` migration and `retention_policy` migration exist in schema.
- External-cron alternative documented (cron-job.org) pinging `notify` URL.

---

## 5. Open gaps / follow-ups (Phase 0)

1. **BLOCKER — refresh the Supabase management token.** Re-run `supabase login`
   (or obtain a fresh `sbp_` token from the dashboard) and capture the 5 live
   Mgmt-API files (project/functions/keys/branches/migrations). Without it,
   project-level config (region, DB version, PITR) is UNVERIFIED.
2. **Backups / PITR UNVERIFIED.** Could not confirm backup enablement or
   Point-in-Time Recovery from local evidence. Confirm via dashboard after
   token refresh (see `backup-check.md`).
3. **`payment_reminder_function_url` Vault secret declared but no matching
   `payment_reminders` function exists.** Either a dead reference or a missing
   function — reconcile. (Reminders appear handled by `notify`.)
4. **CLI is behind** (2.84.2 vs 2.114.0). Update before deploying migrations.
5. **Vault secret rotation unseen.** `service_role_key` and `reclass_kek` are
   high-value; confirm rotation + access logging once dashboard access is
   restored.
6. **`db` extensions** `pg_cron`/`pg_net` must be enabled on live for the
   notify cron to function — verify post-token.

---

## 6. Files produced (all secrets-free)

```
docs/baseline-2026-08/migrations-local.txt        (66 migration filenames)
docs/baseline-2026-08/cli-version.txt             (2.84.2)
docs/baseline-2026-08/node-version.txt            (v22.22.2 / build tool)
docs/baseline-2026-08/function-files.txt          (function dir listing)
docs/baseline-2026-08/migration-ledger.txt        (migration filenames)
docs/baseline-2026-08/idempotency-migration-count.txt (9)
docs/baseline-2026-08/secrets-inventory.md        (names only, no values)
docs/baseline-2026-08/backup-check.md             (verified vs unverified split)
docs/baseline-2026-08/git-log.txt                 (recent commits)
docs/baseline-2026-08/git-remote.txt              (HEAD ref)
docs/baseline-2026-08/*.blocked                   (Mgmt-API calls that 401'd)
BASELINE-2026-08.md                               (this deliverable)
```
