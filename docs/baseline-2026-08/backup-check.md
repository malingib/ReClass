# Backup / PITR Check — Phase 0 Baseline (2026-08)

## What could be verified from local evidence alone

- **Database major version target:** `config.toml` declares `major_version = 17`
  (the local dev target). This does NOT confirm the live project's running
  version or its backup configuration.
- **Migration count:** 66 local migrations in `supabase/migrations/`
  (oldest `20260712230000_core_tables.sql`, newest `20260812000005_platform_config.sql`).
  A migration set this size implies substantial schema state that MUST be
  covered by backups.
- **Cron / scheduled jobs:** `notify` uses `pg_cron` + `pg_net` (per
  `supabase/functions/notify/cron-config.md`) to self-invoke every 2 minutes.
  The `cron_schedules` migration (`20260714000001_cron_schedules.sql`) and a
  `retention_policy` migration (`20260727000001_retention_policy.sql`) exist —
  suggesting the schema expects scheduled jobs and data retention, which depend
  on a healthy database + functional cron.

## What could NOT be verified (requires dashboard / live API)

The Supabase Management API was UNREACHABLE at capture time (auth token expired,
HTTP 401). Therefore the following could NOT be confirmed from evidence and
require a manual dashboard check (Phase 0 follow-up):

1. **Database backups** — is the nightly/automated backup enabled on the live
   project? Last successful backup timestamp?
2. **Point-in-Time Recovery (PITR)** — is PITR enabled? What is the recovery
   window (free tier = none; Pro+ = configurable)?
3. **Branch / fork protection** — any protected branches?
4. **Backup retention period** — days retained.
5. **Storage bucket backups** — separate from DB backups.

## Recommendation

Re-run this check after the management token is refreshed (see
BASELINE-2026-08.md, Gaps). Capture `GET /v1/projects/{ref}` and inspect the
`database` / backup fields, and confirm PITR via the dashboard's database
settings. Until then, treat backups/PITR as **UNVERIFIED**.
