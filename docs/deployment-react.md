# eShule Deployment + Operations — React (Vite) + Supabase

> **Status:** binding per `docs/adr-001-frontend-and-deployment.md` (17 Sep 2026).
> Vite + React SPA on **Vercel** + managed **Supabase** is the single supported
> production path. **VPS / DirectAdmin is rejected** (§12). SvelteKit is frozen.
> Complements `DEPLOYMENT.md`, `OPERATIONS.md`, `docs/dr-runbook.md`,
> `docs/architecture-react.md`.

Stack anchor: `apps/web-react/package.json` (`build: tsc --noEmit && vite build`),
SPA rewrite in `apps/web-react/vercel.json`, functions under `supabase/functions/`,
schema in `supabase/migrations/`, cron in `20260714000001_cron_schedules.sql` +
`20260907222552_school_operations_foundation.sql` +
`20260907222133_replace_http_cleanup_with_native_cron.sql`.

---

## 1. Environments

| Environment | Web (Vercel) | Supabase project | Provider creds | Purpose |
|---|---|---|---|---|
| `dev` | `vercel dev` / local `vite` | local `supabase start` (127.0.0.1:54321) | none / stubbed | daily development |
| `staging` | dedicated Vercel project | dedicated hosted project | **sandbox only** (Daraja sandbox, Mobiwave test sender) | pre-prod verification |
| `prod` | production Vercel project | production hosted project | approved production credentials | live schools |

Rules:

- One Supabase project per environment. **A preview/staging deployment must never
  point at production Supabase.**
- Production secrets never enter PRs, preview builds, local `.env` files, or chat/tickets.
- **Data rules: never use production credentials or real pupil data in dev/staging.**
  Seed with synthetic fixtures (`supabase/seed.sql`, anonymized snapshots only).
  Anonymize before debugging: drop names, phones, admission numbers.
- Auth redirect URLs (`supabase/config.toml` `[auth]`) are per-project; staging and
  prod each register their own Vercel domain. `site_url` in local config is dev-only.

---

## 2. Web pipeline (Vercel)

Source of truth: `apps/web-react/vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- **Build:** `tsc --noEmit && vite build` → `dist/`. Type errors fail the build
  before Vite runs — this is intentional, not optional.
- **SPA rewrite:** `/(.*) → /index.html` so `react-router-dom` owns deep links
  (`/finance/*`, `/reclass/*`, `/parent/*`, …). Without it, refresh on any
  non-root route 404s.
- **Previews:** every PR gets an isolated Vercel preview (wired to **staging**
  Supabase at most). Production deploys only from the protected branch.
- **Promotion:** deploy the exact commit that passed CI + staging smoke (§5, §8) —
  never rebuild prod from an unpinned tree.

Browser vs server secret boundary:

- `VITE_*` vars are **baked into the client bundle at build time** and visible to
  anyone. Only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (+ `VITE_SENTRY_DSN`)
  belong there. The anon key is safe to expose; RLS + Edge re-checks are the boundary.
- **Never** prefix a secret with `VITE_` (`SERVICE_ROLE`, `MPESA_*`, `MOBIWAVE_*`,
  `IMPERSONATION_SECRET`). Those stay in Supabase function secrets / Vault.

---

## 3. Database pipeline (expand-contract, no down-migration)

`supabase/migrations/` is the authoritative, append-only schema history.

- **Expand-contract for breaking changes:** add nullable column/table →
  backfill → dual-write/read → enforce constraint → drop old column. Never
  rename/drop in one step while the live SPA + functions still read the old shape.
- **Local gate (run twice):**

  ```bash
  supabase db start
  supabase db reset --local --yes   # replay full chain from empty DB
  supabase db reset --local --yes   # second pass catches non-idempotent scripts
  ```

  Then regenerate types and confirm zero drift against the replayed schema.
- **Hosted promotion:** review migration → confirm backup/PITR point (§7) →
  verify staging ledger (`supabase migration list`) → `supabase db push` to
  staging → smoke suite → promote the **same** migration set to prod via
  `supabase db push` (see `.github/workflows/database-deploy.yml`, concurrency
  group `supabase-production`, `cancel-in-progress: false`).
- **Never `supabase db reset` against a hosted project.** Never treat SQL Editor
  edits as the migration path — backfill them into a tracked migration.
- **Finance rule: no down-migrate on finance tables.** `payments` rows are
  receipts (`status='paid'` + `receipt_no`); applied migrations touching
  `payments`, `payroll_runs`, `checkout_requests`, `unmatched_payments`,
  `reconcile_payment` are immutable. A bad financial migration is fixed with a
  **forward corrective migration** (or PITR restore, §8) — never `DROP`/`ALTER`
  history away.

---

## 4. Edge Functions deploy

Per-function deploys from the same commit as web + DB. JWT posture is per-function
(`supabase/config.toml` + `--no-verify-jwt` flags in `database-deploy.yml`):

| Function | JWT | Purpose |
|---|---|---|
| `stk`, `reclass-stk` | verified | authenticated STK push initiation, duplicate guard |
| `mpesa-callback`, `reclass-mpesa-callback` | **off** (`verify_jwt = false`) | Daraja calls with no Supabase JWT — app-level `x-callback-secret` + fail-closed |
| `b2c`, `b2c-result` | verified / internal | B2C payout claim → Daraja → async finalize |
| `payroll-ops` | verified | payroll state machine (`draft → approved → paid`) |
| `notify` | service-role-gated | drains `notifications` ≤50/batch (called by pg_cron) |
| `sms-campaign` | verified | bulk sends |
| `reports-csv` | verified, role-gated | CSV exports (5 000-row cap) |
| `cleanup-pending-checkouts` | internal/cron | expires stale `checkout_requests` |

Deploy:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy <name> [--no-verify-jwt]   # callback fns only
supabase secrets set MPESA_CALLBACK_SECRET=... MOBIWAVE_BASE=... \
  SUPABASE_SERVICE_ROLE_KEY=... PUBLIC_URL=... --project-ref <ref>
```

Required function secrets (server-side only):

- `MPESA_CALLBACK_SECRET` — Daraja callback `x-callback-secret`, fail-closed.
- `MOBIWAVE_BASE` — Mobiwave API v3 base (`https://sms.mobiwave.co.ke/api/v3`).
- `SUPABASE_SERVICE_ROLE_KEY` — service-role client inside functions; every query
  still scoped explicitly by `tenant_id` (service role bypasses RLS).
- `PUBLIC_URL` — canonical project URL so Daraja callbacks resolve; must match
  the live project after any restore/re-point.

Cron (migrations, not copy-paste — they survive `db reset`):

- `reclass-sms-notify` — pg_cron every 2 min → pg_net POST `notify` (Vault URLs).
- `reclass-payment-reminders` — daily 08:00 → payment-reminder enqueue.
- `enqueue-teacher-task-reminders` — every 10 min (`20260907222552`).
- `cleanup-stale-checkouts` — native Postgres cron expiring `pending`
  `checkout_requests` older than **30 min** (`20260907222133`).
- Vault secrets (`notify_function_url`, `payment_reminders_function_url`,
  `service_role_key`, `reclass_kek`) are created once per project, never in git.

---

## 5. CI gates

`.github/workflows/ci.yml` (all pushes/PRs):

1. `npm ci` + `npm audit --audit-level=high` (non-blocking alert).
2. `npm run lint` (eslint) and `npm run check:boundaries`.
3. `python3 scripts/verify_tenant_isolation.py src` — static tenant-scope check.
4. `npm run typecheck` (`tsc --noEmit`).
5. `npm run test --workspace=@eshule/web-react` (vitest).
6. `npm run build` (`tsc + vite build`) — a green Vercel build alone is **not**
   release readiness.
7. `database` job: `supabase db start` → `supabase db reset --local` (migration
   replay + seed) → `supabase/tests/tenant_isolation.sql` cross-tenant checks.
8. `e2e` job (push-gated, secret-guarded so forks skip): Playwright against a
   **non-prod** project (`apps/web-react/playwright.config.ts`).

`.github/workflows/database-deploy.yml` (main, migration/function paths):
link prod → `supabase db push` → `supabase migration list` ledger verify →
deploy `mpesa-callback` (`--no-verify-jwt`), `reclass-stk` (JWT),
`reclass-mpesa-callback` (`--no-verify-jwt`).

Release = all gates green **on the same commit**, then staging smoke (§8 of
`DEPLOYMENT.md`: auth/routing, negative cross-tenant test, bursar/ReClass/payroll/
receipt/notification/audit flows, staging STK idempotency) before prod promotion.

---

## 6. Environment variable tables

### 6a. Web (Vercel, `VITE_*` — public, baked at build)

| Var | Env | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` (`PUBLIC_SUPABASE_URL` fallback in CI) | per-env | staging preview → staging project; prod → prod project |
| `VITE_SUPABASE_ANON_KEY` (`PUBLIC_SUPABASE_ANON_KEY` fallback) | per-env | anon only; RLS enforced |
| `VITE_SENTRY_DSN` | per-env | browser error reporting (`@sentry/react`) |

### 6b. Edge Functions (Supabase secrets — server-side, never `VITE_`)

| Var | Used by | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | all privileged fns | bypasses RLS — scope by `tenant_id` in code |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | runtime binding | project URL/key binding |
| `MPESA_CALLBACK_SECRET` | `mpesa-callback`, `reclass-mpesa-callback` | `x-callback-secret`, fail-closed, 10 KB body cap |
| `MOBIWAVE_BASE` | `notify`, `sms-campaign` | API v3 base URL |
| `MOBIWAVE_API_TOKEN` | `notify`, `sms-campaign` | sender credential, Vault/secret only |
| `PUBLIC_URL` | callbacks, Daraja registration | must match live project |
| `IMPERSONATION_SECRET` | auth fn (where enabled) | rotate on compromise |

Never commit secrets, print them in CI logs, or store backup exports in the repo.

---

## 7. Backups

- **Postgres:** Supabase daily automated backups **+ PITR enabled** (Pro plan) on
  prod. Pre-launch checklist in `docs/dr-runbook.md`: PITR on, first drill logged,
  Vault KEK (`reclass_kek`) escrowed in the ops password manager.
- **Cross-region copy:** retain a periodic backup export outside the primary
  region (dashboard download → encrypted ops storage). Tenant M-Pesa/Mobiwave
  credentials are KEK-encrypted — **losing the KEK loses all tenant credentials**;
  escrow it separately from the data backup.
- **Targets:** **RPO ≤ 5 min** (PITR), **RTO ≤ 4 h** (restore + re-point + verify).
- **Also versioned in git:** full migration chain (schema replay), Edge Function
  source, Vercel immutable deployments. Secrets inventory: Vault + `supabase
  secrets list` + Vercel env — sealed copy in the password manager.

---

## 8. Restore drill

- **Monthly (automated):** fresh project/branch → `supabase db push` (clean replay)
  → deploy functions → set secrets → point a Vercel preview at the drill project →
  verify `/healthz`-equivalent (public app + login), seeded-user login, dashboard
  RPC, sandbox STK end-to-end. Log date/elapsed/gaps.
- **Quarterly (full):** monthly flow **plus** Auth linkage (redirect URLs, seeded
  users, role assignments), function secrets + Vault KEK verification (re-enter
  tenant creds path if KEK unrecoverable), pg_cron job presence
  (`reclass-sms-notify`, `reclass-payment-reminders`,
  `enqueue-teacher-task-reminders`, `cleanup-stale-checkouts`), Storage buckets,
  RLS/grants smoke (negative cross-tenant test), Daraja/Mobiwave callback URL
  documentation per environment.
- Record drills in `docs/dr-drill-log.md`; tear down drill projects. A prod
  deployment is not "recoverable" until a restore has been demonstrated.

---

## 9. Monitoring / logging

- **Sentry (`@sentry/react`):** browser error rate + release tagging per deploy;
  no unresolved critical spike is a daily check (`OPERATIONS.md` §2).
- **Supabase logs:** DB errors/latency, Auth failures, function invocations,
  pg_cron run history (success/lag per job), backup/PITR status.
- **`/healthz` shallow probe:** public-app availability + DB connectivity probe
  for uptime monitors and post-deploy verification (deep business checks stay in
  the smoke suite, not the probe).
- **Alerts:** `notifications` queue depth/age/retries, **STK success rate**
  (pending/failed/reconciled counts, duplicate-identity spikes),
  **SMS delivery rate** (Mobiwave error rate, failed-send growth), provider
  credential expiry, critical authorization-failure rate.
- **Request IDs:** redacted structured logs with correlation/request identifiers
  end-to-end (SPA → Edge → Daraja/Mobiwave → RPC); never log pupil PII, full
  phone numbers, secrets, or provider payloads into tickets.

---

## 10. Rollback

Web and DB rollback are separate concerns:

- **Web (instant):** Vercel Deployments → previous good build → Promote to
  Production (~2 min, immutable artifact). No DB action.
- **DB (roll-forward, not down-migrate):** corrective forward migration; for
  data-destructive errors restore to the PITR timestamp just before the migration,
  then re-apply the corrected chain. **Never reverse an applied finance migration.**
- **Functions:** redeploy the last-known-good commit's function bundle alongside
  the web rollback (callback JWT posture must stay consistent).
- Record: release commit, deployment id, migration versions, failure, decision
  owner, recovery action, post-recovery verification. Use expand-contract +
  compatibility windows so the old web build keeps working during DB transitions.

---

## 11. Incident runbook

| Severity | Definition | Response |
|---|---|---|
| **SEV-1** | suspected cross-tenant exposure; finance corruption; prod DB down | stop affected op/deploy, page on-call, freeze deploys |
| **SEV-2** | M-Pesa/SMS outage; payroll blocked; queue backlog growing | preserve idempotent state, retry via queue, comms to affected schools |
| **SEV-3** | single-tenant defect; degraded non-critical path | normal ticket, fix-forward |

- **Ownership:** route to the domain owner (Bursar → school finance,
  ReClass → remedial ops, Payroll → compensation, Receipts → payment evidence,
  shared services → notifications/audit, platform/SRE → infra) with cross-domain
  coordination. See `OPERATIONS.md` §§3–8 for payment/payroll/notification/
  tenant-isolation/provider-outage procedures.
- **Comms:** status without secrets/payloads; Kenya DPA 2019 breach assessment
  (72 h notification) for exposure incidents; never browse another tenant's live
  data during investigation.
- **Kill-switches** (fail-closed, per-tenant where applicable):
  - **STK:** disable `stk`/`reclass-stk` initiation (feature flag / function env)
    while preserving callback reconcile so in-flight payments still land.
  - **SMS:** pause `reclass-sms-notify` cron / `notify` drain; queue retains work.
  - **AI:** disable AI-assisted sends/summaries; fall back to manual review queues.

---

## 12. VPS-rejection rationale + what a VPS ADR would require

Per ADR-001, DirectAdmin EVO VPS is **rejected** for this authenticated,
multi-tenant, finance-sensitive app: it would re-introduce undifferentiated
ops load (OS patching, TLS/firewall, process supervision, backup/PITR design,
log retention, secret storage) with no material business benefit over
Vercel static + managed Supabase, while coupling a hosting change to
security-sensitive code. Next.js SSR is rejected on the same basis (no SSR need
for the ops SPA).

A future VPS ADR would have to prove material benefit **and** deliver, before
any migration:

1. threat model (tenant isolation, callback auth, secret storage vs Vault/KEK);
2. backup/restore design meeting RPO ≤ 5 min / RTO ≤ 4 h with demonstrated drills;
3. process supervision + health checks + zero-downtime deploy + instant rollback;
4. TLS, firewall, OS/patch policy, and on-call ownership;
5. staging parity + CI gates (migration replay, cross-tenant tests, E2E non-prod);
6. rollback plan for both app and (forward-only) DB, incl. finance-table rules.

Until such an ADR is approved, VPS work must not land in the release path.

---

## Related documentation

- `docs/adr-001-frontend-and-deployment.md` — binding decision
- `docs/architecture-react.md` — containers, flows, invariants
- `DEPLOYMENT.md`, `OPERATIONS.md`, `docs/dr-runbook.md` — release, runbooks, DR
- `.github/workflows/ci.yml`, `database-deploy.yml` — executable gates
- `supabase/config.toml`, `supabase/migrations/` — functions posture, cron, schema
