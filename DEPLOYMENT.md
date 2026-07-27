# ReClass Deployment

**Implementation audit date:** 2026-07-22  
**Status:** **BLOCKED. Do not deploy or promote the current repository to production.**

This document describes what is present in the repository, not what is proven to be running in any hosted environment. The release gate is blocked because the migration chain cannot be replayed from an empty database: policies in `supabase/migrations/20260722000006_create_messages.sql:20` and `supabase/migrations/20260722000007_create_exams.sql:19,42` call `app.tenant_id()`, but no migration creates that schema/function. Hosted migration state is also not evidenced. See `DATABASE.md:124-156`.

## 1. Current Deployment Evidence

| Concern | Repository evidence | Audit conclusion |
|---|---|---|
| Web adapter | `svelte.config.js:1,8` uses `@sveltejs/adapter-vercel` | The normal `npm run build` output targets Vercel. |
| Container path | `Dockerfile:6-13` edits `svelte.config.js` during build to select `adapter-node` | Docker creates a different application artifact from the same commit. |
| VPS instructions | `docs/deployment.md:3-9,64-84` describes Docker Compose and DirectAdmin | No Compose file exists, so the documented commands are not reproducible. |
| CI | `.github/workflows/ci.yml` runs npm lint, typecheck, unit tests, and build | It does not replay migrations, check Edge Functions, run E2E, package an immutable artifact, deploy, or promote. |
| Database | `supabase/migrations/` and `supabase/config.toml` | Clean replay is blocked; `supabase/config.toml:5` also has a stale project ID. |
| Edge Functions | `supabase/functions/*/index.ts` | Five functions exist; repository CI/deployment does not validate or deploy them. |
| Infrastructure | no `vercel.json`, Compose, Terraform, Pulumi, Helm, or deployment workflow | Domains, projects, backups, alerts, secrets, and promotion are manual/unversioned. |

### Vercel vs Docker mismatch

These are not interchangeable deployment paths:

- Vercel uses the committed `svelte.config.js` and `@sveltejs/adapter-vercel`.
- Docker mutates that file inside a builder layer and produces an adapter-node server (`Dockerfile:6-13`). A local `npm run build` and a Docker build therefore do not test the same output.
- `docs/deployment.md` claims Docker Compose, but no `docker-compose.yml` or `docker-compose.yaml` exists.
- There is no repository evidence showing which path is actually deployed in production.

### Current Docker defects

The Docker path is **not deployable as audited**:

1. `Dockerfile:6-13` runs `npm install` after `npm ci` and rewrites source configuration at build time. This changes dependency metadata and makes the artifact differ from CI's normal build.
2. `Dockerfile:17-18` copies only `build/` and `package.json` into the runtime image. It does not install/copy production dependencies required by an adapter-node deployment.
3. `Dockerfile:15-21` runs as root and defines no `HEALTHCHECK`, init process, resource policy, or graceful-shutdown settings.
4. No `.dockerignore` exists. `COPY . .` at `Dockerfile:5` sends local `.env`, generated output, Git data, and other unnecessary files into the build context. `.gitignore` does not control Docker build context.
5. No Compose or orchestration manifest defines restart policy, health routing, resource limits, networking, or secret injection.
6. No image registry, immutable tag/digest, vulnerability scan, SBOM, signature, deployment workflow, or rollback automation exists.
7. Docker validation could not be executed on the audit host because `docker` is not installed (`docker build --check .` returned `docker: command not found`). The static defects above remain independently verifiable.

## 2. Authoritative Deployment Recommendation

Use **Vercel for the web application** and **managed Supabase for PostgreSQL, Auth, Vault, cron, and Edge Functions**. This is authoritative because it follows the committed adapter instead of mutating source during packaging. Treat `Dockerfile` and `docs/deployment.md` as non-authoritative until they are reconciled or removed in a separate change.

Use two isolated stacks:

| Environment | Web | Data/functions | External integrations |
|---|---|---|---|
| Staging | separate Vercel project/domain | separate Supabase project | Daraja sandbox and non-production SMS credentials |
| Production | production Vercel project/domain | production Supabase project | Daraja production and approved Mobiwave sender ID |

Never point a Vercel preview/staging deployment at production Supabase. The service-role key used by the web server bypasses RLS (`src/lib/supabase/server.ts`, `README.md:57-61`).

### Authoritative migration process

Migrations in `supabase/migrations/` are the only schema source of truth. Do not use ad hoc SQL Editor changes as the deployment mechanism.

Before any hosted migration:

1. Repair the undefined `app.tenant_id()` policies and settle one RLS model.
2. Inventory the hosted migration ledger and schema before changing it.
3. Take and verify a restorable backup/PITR point.
4. Prove clean replay twice from zero.
5. Rehearse the upgrade against a production-like restored snapshot.
6. Regenerate `src/lib/supabase/database.types.ts` from the resulting schema and fail CI on drift.

Apply migrations with `supabase db push`, first to staging and then to production. Never run `supabase db reset` against a linked hosted project.

## 3. Prerequisites

### Web prerequisites

- Node.js 22 (`package.json:6-8`, `.nvmrc`).
- npm with the committed `package-lock.json`.
- A Vercel account, two projects, protected production environment, and Vercel CLI.
- Two Supabase projects with PostgreSQL major version compatible with `supabase/config.toml:27-36`.
- DNS/TLS for staging and production domains.
- Sentry projects/environments if error monitoring is required.

### Supabase and Edge Function prerequisites

- Supabase CLI pinned to an approved version in CI rather than an unpinned global install.
- Deno 2 for local Edge Function checks (`supabase/config.toml:357-366`).
- Docker-compatible local runtime for `supabase start`/`supabase db reset`.
- Hosted extensions/services used by migrations: Vault, `pg_cron`, `pg_net`, and cryptographic functions (`supabase/migrations/20260714000001_cron_schedules.sql:7-20`).
- Separate Daraja and Mobiwave accounts/credentials per environment.
- Supabase Auth redirect URLs and signup policy configured per environment. The committed local config enables signup (`supabase/config.toml:150-175`); this audit recommends invite-only production provisioning, but hosted Auth settings are not evidenced.

## 4. Environment Variables and Secrets

### Web application

| Variable | Scope | Required | Evidence/notes |
|---|---|---:|---|
| `PUBLIC_SUPABASE_URL` | build/runtime, public | yes | Validated at startup in `src/lib/server/middleware.ts:13-24`. |
| `PUBLIC_SUPABASE_ANON_KEY` | build/runtime, public | yes | Browser-safe anon key; validated at startup. |
| `SUPABASE_SERVICE_ROLE_KEY` | server runtime, secret | yes | Bypasses RLS; never expose to browser or preview logs. |
| `IMPERSONATION_SECRET` | server runtime, secret | strongly required | If absent, code falls back to service role (`src/lib/server/impersonation.ts`). Use an independent random value. |
| `SENTRY_DSN` | server runtime, secret/config | optional | Enables server Sentry (`sentry.server.config.ts`). |
| `PUBLIC_SENTRY_DSN` | public build/runtime | optional | Enables browser Sentry and replay (`sentry.client.config.ts`). |

`SECRET_KEY` appears in `.env.production.example:8-9` but no current runtime usage was found in the audit. Do not create an unowned secret merely to satisfy stale documentation; either connect it to a defined control or remove it in a separate reviewed change.

### Supabase Edge Functions

| Variable | Required | Evidence/notes |
|---|---:|---|
| `SUPABASE_URL` | yes | Required by `supabase/functions/_shared/supabase.ts:14`. Supabase normally injects it. |
| `SUPABASE_ANON_KEY` | yes | Required to construct authenticated user clients in `_shared/supabase.ts:23-26`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Used for privileged DB access and authenticating cron calls. Supabase normally injects it. |
| `PUBLIC_URL` | yes, but currently ambiguous | `_shared/cors.ts:1-7` treats it as a web origin, while `stk/index.ts:67` treats it as the Supabase base used to form `<PUBLIC_URL>/functions/v1/mpesa-callback`. One value cannot represent both origins. Production/staging web origins are separately hard-coded in CORS, so the callback only forms correctly when this is the Supabase project origin. Repair this overloaded contract before adding other environments and verify the generated callback URL. |
| `MPESA_CALLBACK_SECRET` | production mandatory | Callback verification is skipped when absent (`mpesa-callback/index.ts:5-14`). Confirm Safaricom/proxy can supply `x-callback-secret`; otherwise implement a supported callback authentication control before launch. |
| `MOBIWAVE_BASE` | optional override | Defaults to `https://sms.mobiwave.co.ke/api/v3` (`notify/index.ts:6`). |

Provider credentials are application data encrypted/resolved through `credentials` and database RPCs, not plain function variables (`stk/index.ts:53-58`, `notify/index.ts:43-55`). Vault must additionally contain the cron URLs and service-role key named in `supabase/migrations/20260714000001_cron_schedules.sql:13-17` and keep-warm URLs named in `supabase/migrations/20260722000004_edge_function_keepwarm.sql:6-9`.

### Secret handling

- Store web secrets in environment-scoped Vercel secret storage and Edge secrets with `supabase secrets set`; do not commit `.env` files.
- Store CI credentials in an OIDC-backed secret manager where supported; otherwise use environment-protected, short-lived credentials. Do not expose production secrets to pull requests.
- Keep anon keys distinct from service-role keys despite both being JWT-like strings.
- Rotate service-role, callback, impersonation, Daraja, Mobiwave, and CI tokens on an approved schedule and after suspected exposure.
- Rotation must update Edge secret values, Vault's `service_role_key` used by cron, web runtime secrets, and external callback configuration as one change with smoke tests.
- Sentry/browser replay may capture sensitive school or payment context. Configure scrubbing and consent before enabling production replay (`sentry.client.config.ts:7-8`).

## 5. Reproducible CI/CD Target

The target pipeline must build and promote the same commit, never rebuild production from a moving branch.

### Pull request and commit gates

Run from repository root:

```bash
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npx supabase start
npx supabase db reset
npx supabase db reset
npx supabase functions serve --env-file supabase/.env.test
npx playwright install --with-deps chromium
npx playwright test
git diff --exit-code -- src/lib/supabase/database.types.ts
```

Add explicit Deno gates for every function:

```bash
deno fmt --check supabase/functions
deno lint --config supabase/functions/deno.jsonc supabase/functions
deno check --config supabase/functions/deno.jsonc supabase/functions/*/index.ts
```

The current `.github/workflows/ci.yml` performs only the npm subset. The target must also record test reports, migration output, generated schema checks, dependency audit, secret scan, and an SBOM as immutable build evidence.

### Staging deployment

Use non-interactive, explicitly scoped commands:

```bash
export SUPABASE_ACCESS_TOKEN='<staging-token>'
export SUPABASE_DB_PASSWORD='<staging-db-password>'
npx supabase link --project-ref '<staging-project-ref>'
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy stk --project-ref '<staging-project-ref>'
npx supabase functions deploy mpesa-callback --no-verify-jwt --project-ref '<staging-project-ref>'
npx supabase functions deploy notify --project-ref '<staging-project-ref>'
npx supabase functions deploy payment-reminders --project-ref '<staging-project-ref>'
npx supabase functions deploy credentials-test --project-ref '<staging-project-ref>'
vercel pull --yes --environment=preview --token "$VERCEL_TOKEN"
vercel build --token "$VERCEL_TOKEN"
vercel deploy --prebuilt --token "$VERCEL_TOKEN"
```

Pin the CLI versions in the implemented workflow. Capture the Vercel deployment URL, Git SHA, Supabase migration list, function deployment output, and smoke-test results.

### Production promotion

Production requires manual approval after staging soak and evidence review. Re-run migration drift/dry-run against production, apply forward-compatible migrations before code, deploy the exact tested function source and prebuilt web artifact, then promote traffic.

```bash
export SUPABASE_ACCESS_TOKEN='<production-token>'
export SUPABASE_DB_PASSWORD='<production-db-password>'
npx supabase link --project-ref '<production-project-ref>'
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy stk --project-ref '<production-project-ref>'
npx supabase functions deploy mpesa-callback --no-verify-jwt --project-ref '<production-project-ref>'
npx supabase functions deploy notify --project-ref '<production-project-ref>'
npx supabase functions deploy payment-reminders --project-ref '<production-project-ref>'
npx supabase functions deploy credentials-test --project-ref '<production-project-ref>'
vercel deploy --prebuilt --prod --token "$VERCEL_TOKEN"
```

`mpesa-callback` cannot require a Supabase user JWT because Safaricom invokes it. `--no-verify-jwt` therefore makes mandatory application-level callback authentication and provider validation security-critical (`supabase/functions/mpesa-callback/index.ts:5-20`). Persist this setting in reviewed configuration/automation rather than relying indefinitely on a command flag. Do not run these commands while the blocked gates at the top of this document remain unresolved.

## 6. Smoke Tests and Verification

Replace placeholders with environment-specific values. Never put service-role keys in shell history on shared hosts.

```bash
export BASE_URL='https://staging.reclass.co.ke'
export SUPABASE_FUNCTIONS_URL='https://<project-ref>.supabase.co/functions/v1'
curl --fail-with-body --silent --show-error -I "$BASE_URL/login"
curl --fail-with-body --silent --show-error -X OPTIONS "$SUPABASE_FUNCTIONS_URL/stk" \
  -H "Origin: $BASE_URL" \
  -H 'Access-Control-Request-Method: POST'
```

The implemented `/api/healthz` cannot currently serve as an external smoke test because global route guarding redirects unauthenticated requests and may redirect authenticated role users (`src/lib/server/middleware.ts:120-135`). Even after its access behavior is repaired, it is only a shallow application check (`src/routes/api/healthz/+server.ts`) and does not prove database readiness, migrations, cron execution, payment, or SMS. Before promotion, implement the public non-sensitive probes defined in `OPERATIONS.md`, then also perform:

- authenticated login and role redirect in the target tenant;
- one tenant-isolation negative test;
- a Daraja sandbox STK request and idempotent callback replay in staging;
- one Mobiwave test/controlled SMS and queue-state verification;
- cron/Vault inventory and recent execution checks from `OPERATIONS.md`;
- migration/table/policy checks below;
- confirmation that production signup and redirect URL settings are correct.

### Exact database verification commands

Run against staging first, then production using a least-privileged operational connection where possible:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select version();"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select extname from pg_extension where extname in ('pg_cron','pg_net','pgcrypto','supabase_vault') order by 1;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select version, name from supabase_migrations.schema_migrations order by version;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select jobid, jobname, schedule, active from cron.job order by jobname;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public' order by tablename, policyname;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select to_regprocedure('app.tenant_id()') as tenant_policy_helper;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select name from vault.decrypted_secrets where name in ('notify_function_url','payment_reminders_function_url','service_role_key','stk_function_url','mpesa_callback_function_url','credentials_test_function_url') order by name;"
```

The secret inventory command intentionally selects names, not decrypted values. Until the policy helper/RLS mismatch is repaired, the expected `tenant_policy_helper` result is null and deployment remains blocked.

## 7. Promotion, Traffic Strategy, and Rollback

### Staging-to-production promotion

1. Merge only after all CI gates pass.
2. Deploy commit SHA to staging and record migration/function/web versions.
3. Run smoke, payment, SMS, tenant-isolation, and cron checks.
4. Soak staging for an agreed period with no critical Sentry events or queue lag.
5. Obtain production approval and a confirmed database recovery point.
6. Apply backward-compatible production migrations.
7. Deploy functions, then the exact prebuilt web artifact.
8. Observe health, errors, latency, callbacks, queue lag, and business reconciliation during rollout.

### Blue-green/canary

The web tier can use Vercel preview deployments as green and alias/promotion as the traffic switch. Keep blue available for immediate alias rollback. Vercel percentage canary routing is not configured in this repository; use a platform feature or external edge/load balancer only after it is represented as code and tested.

Supabase database migrations are shared state and cannot be blue-green in this design. Use expand/migrate/contract changes:

- release additive/backward-compatible schema first;
- deploy code that tolerates old and new schema during the rollout;
- migrate/backfill with bounded jobs and observability;
- remove old schema only in a later release after rollback is no longer required.

Edge Functions should be backward compatible with both web versions and provider retries. If true Edge canary/version routing is unavailable, deploy staging first and keep the previous source bundle and secrets manifest ready for explicit redeploy.

### Rollback

Web rollback: promote the previously healthy Vercel deployment; do not rebuild it.

```bash
vercel ls --token "$VERCEL_TOKEN"
vercel promote '<previous-deployment-url>' --yes --token "$VERCEL_TOKEN"
curl --fail-with-body --silent --show-error 'https://app.reclass.co.ke/api/live'
```

If the installed Vercel CLI does not support `promote`, switch the production alias in the Vercel control plane/API and record the action. Verify the exact CLI in a staging drill before launch.

Function rollback: redeploy the previous Git SHA's function directory, then verify authorization and one controlled request. Database rollback: prefer a forward fix. Do not reverse financial migrations casually. Use PITR only for destructive/corrupting changes under incident command because it rewinds all tenants and must be reconciled with M-Pesa callbacks and other external side effects.

Rollback is complete only after web smoke tests, database checks, cron status, pending payment reconciliation, and notification queue checks pass.

## 8. Infrastructure as Code Gaps

No IaC currently defines:

- Vercel projects, environment variables, domains, aliases, deployment protection, or retention;
- Supabase projects, compute/database sizing, Auth settings, redirect allowlists, network restrictions, backup/PITR retention, log drains, or alerts;
- Vault secret names/rotation metadata and Edge Function environment policy;
- DNS, TLS, WAF/rate limits, uptime checks, Sentry projects, paging routes, or status page;
- CI environments, approval rules, OIDC trust, artifact registry, SBOM/signing, or rollback automation;
- recovery region/project, off-platform backup storage, retention lock, or restore jobs.

The target is reviewed Terraform/Pulumi or provider/API-backed automation plus migrations for database objects. Where a provider cannot manage Supabase/Vercel settings, use an idempotent audited script and detect drift in CI. Never place secret values in state without an encrypted remote backend, strict access control, and an explicit secret-management design.

## 9. Deployment Blockers

- [ ] Repair and replay the full migration chain twice from zero.
- [ ] Establish and reconcile the hosted migration/schema state.
- [ ] Add executable migration, Edge Function, and E2E gates to CI.
- [ ] Choose and automate the Vercel path; prevent accidental Docker/VPS deployment.
- [ ] Provision separate staging and production stacks and secrets.
- [ ] Make `MPESA_CALLBACK_SECRET` enforcement operationally valid and mandatory.
- [ ] Separate the Edge callback base URL from the allowed web origin configuration.
- [ ] Configure and verify Vault cron secret names and all expected jobs.
- [ ] Implement readiness, metrics, alerts, backup/PITR, and a successful off-platform restore drill.
- [ ] Approve measurable SLO/RTO/RPO and on-call ownership from `OPERATIONS.md`.
- [ ] Execute a staging promotion and rollback rehearsal with retained evidence.

Until every P0 item and release gate above has evidence, **current deployment is blocked**.
