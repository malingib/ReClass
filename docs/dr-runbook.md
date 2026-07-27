# Disaster Recovery Runbook — ReClass

**Scope:** Supabase (Postgres + Auth + Edge Functions + Vault) and Vercel app.
**RPO target:** ≤ 24h (daily backups) — upgrade to PITR (≤ 2min) before onboarding paying tenants.
**RTO target:** ≤ 4h.

## 1. Backup posture

| Asset | Mechanism | Where |
|---|---|---|
| Postgres data | Supabase daily automated backups (Pro plan) / PITR if enabled | Supabase dashboard → Database → Backups |
| Schema | 38 migrations in `supabase/migrations/` (git) — full replay tested by `migrations.test.ts` | repo |
| Edge Functions | Source in `supabase/functions/` (git); deployed via `supabase functions deploy` | repo |
| Secrets | Supabase Vault (`reclass_kek`), function env (`supabase secrets list`), Vercel env vars | dashboards — **export a sealed copy to the ops password manager** |
| App | Vercel immutable deployments (instant rollback) + Dockerfile fallback | Vercel |

> ⚠️ Tenant credentials (M-Pesa/Mobiwave) are encrypted with the Vault KEK. **Losing the KEK = losing all tenant credentials.** Verify `reclass_kek` exists in Vault on the restored project before declaring recovery complete; if unrecoverable, tenants must re-enter credentials (communicate this in the incident notice).

## 2. Restore drill (run quarterly — do NOT wait for a real incident)

1. Create a fresh Supabase project (or branch): `supabase projects create reclass-drill`.
2. Link and replay migrations: `supabase link --project-ref <ref> && supabase db push`.
   - Expected: all migrations apply cleanly, zero errors.
3. Download latest production backup (dashboard → Backups → Download) and restore:
   `psql "$DRILL_DB_URL" < backup.sql` (or dashboard restore for PITR).
4. Deploy Edge Functions: `supabase functions deploy stk mpesa-callback notify payment-reminders credentials-test --project-ref <ref>`.
5. Set function secrets: `supabase secrets set MPESA_CALLBACK_SECRET=... --project-ref <ref>`.
6. Recreate Vault KEK if missing (invalidates old encrypted blobs — see warning above).
7. Point a Vercel preview deployment at the drill project (env overrides) and verify:
   - `/api/healthz` returns 200
   - login with a seeded test user works
   - admin dashboard loads (exercises `get_admin_dashboard_stats` RPC)
   - a sandbox STK push completes end-to-end
8. Record drill date, elapsed time, and any gaps in `docs/dr-drill-log.md`. Tear down the drill project.

## 3. Incident procedures

### 3.1 Bad deploy (app regression)
Vercel dashboard → Deployments → previous good build → **Promote to Production**. RTO: ~2 min. No DB action.

### 3.2 Bad migration
Migrations are append-only. Write a corrective forward migration; never edit history. If data-destructive: restore to PITR timestamp just before the migration, then re-apply the corrected chain.

### 3.3 Database loss / region outage
Follow the restore drill (§2) against a new project, then repoint `PUBLIC_SUPABASE_URL` / keys in Vercel env and redeploy. Update the M-Pesa callback URL in Daraja portal and Mobiwave webhook if project ref changed.

### 3.4 Credential/secret compromise
1. Rotate `SUPABASE_SERVICE_ROLE_KEY` (dashboard → API) and update Vercel + CI secrets.
2. Rotate `IMPERSONATION_SECRET`, `MPESA_CALLBACK_SECRET`.
3. Audit `audit_log` for the exposure window; notify affected tenants per Kenya DPA 2019 (72h breach notification).

## 4. Pre-launch checklist
- [ ] Supabase Pro plan with PITR enabled
- [ ] First restore drill completed and logged
- [ ] Vault KEK escrowed in ops password manager
- [ ] Daraja/Mobiwave callback URLs documented per environment
- [ ] On-call contact + escalation path documented
