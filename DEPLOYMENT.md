# eShule Deployment

**Document status:** Current deployment standard  
**Last reviewed:** 2026-09-01  
**Product:** eShule — with ReClass as the remedial learning/programme-management module

This document describes the supported deployment model. Historical audit findings are retained in [`AUDIT-2026-08.md`](AUDIT-2026-08.md); they are evidence of the state reviewed at that time and must not be read as the current release status.

## 1. Supported architecture

The supported production architecture is:

- **Web application:** SvelteKit deployed to Vercel using `@sveltejs/adapter-vercel`.
- **Database/Auth:** managed Supabase PostgreSQL and Supabase Auth.
- **Server-side privileged operations:** narrow server/Edge Function paths using the Supabase service role where required; every operation must still enforce tenant and capability boundaries.
- **Edge Functions:** Supabase Edge Functions for M-Pesa, notifications, scheduled/background integrations and other provider-facing operations.
- **External providers:** M-Pesa/Daraja and Mobiwave SMS, with credentials stored through the application's encrypted credential/configuration model.

Docker is **not** a supported production deployment path. The legacy Docker artifacts and VPS instructions should not be used to promote a release.

## 2. Environments

Maintain isolated staging and production environments.

| Environment | Web | Supabase | Provider credentials |
|---|---|---|---|
| Staging | dedicated Vercel project | dedicated Supabase project | sandbox/non-production |
| Production | production Vercel project | production Supabase project | approved production credentials |

A preview deployment must never point at production Supabase. Production secrets must never be exposed to pull requests or preview builds.

## 3. Release gates

A release is deployable only when all applicable gates are green:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Database changes additionally require:

```bash
npx supabase db reset
npx supabase db reset
```

The migration chain must replay from an empty database, and generated Supabase types must match the resulting schema. CI should also run tenant-isolation, migration/integration and Edge Function checks before production promotion.

Do not treat a successful Vercel build alone as deployment readiness.

## 4. Database deployment

`supabase/migrations/` is the authoritative schema history. Applied migrations are immutable; corrections are made with forward-only migrations.

Before a hosted migration:

1. Review the migration and affected tenant/security/financial invariants.
2. Verify staging is on the expected migration ledger.
3. Confirm a restorable backup/PITR point.
4. Apply to staging and run the critical smoke suite.
5. Review schema and generated-type drift.
6. Promote the same migration set to production.

Never use `supabase db reset` against a hosted production project.

## 5. Web deployment

Build and deploy the exact commit that passed CI. Do not rebuild production from an unpinned working tree.

The committed SvelteKit configuration is the source of truth for the web adapter. Do not mutate `svelte.config.js` during packaging.

Recommended promotion sequence:

1. Merge the reviewed change to the protected production branch.
2. Wait for required CI checks.
3. Deploy the resulting commit to staging.
4. Run authentication, tenant-isolation, critical workflow and integration smoke tests.
5. Approve production promotion.
6. Deploy the same tested commit/artifact to production.
7. Verify health, logs, database connectivity and critical business flows.

## 6. Edge Functions

Deploy provider-facing functions from the same commit as the web application and database changes. At minimum, verify the functions currently present under `supabase/functions/` before promotion.

The M-Pesa callback endpoint is invoked by the provider rather than an authenticated browser user. It therefore must not rely on a Supabase user JWT; application-level callback authentication and provider validation are mandatory.

Callback secrets, provider credentials and service-role credentials must fail closed when required configuration is absent.

## 7. Required secrets/configuration

Web runtime configuration includes:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPERSONATION_SECRET` where impersonation is enabled
- Sentry configuration where enabled

Edge Functions require the Supabase-provided runtime credentials plus the provider/configuration secrets documented in [`docs/integrations.md`](docs/integrations.md).

Never commit secrets, place them in source-controlled Markdown, or print them in CI logs.

## 8. Post-deployment smoke tests

Verify at least:

- public application/login availability;
- correct tenant and role routing;
- one negative cross-tenant authorization test;
- Teacher workspace access according to `teacher_type` and committee assignment;
- Bursar school-finance workflows;
- ReClass remedial workflow and committee separation of duties;
- Payroll generation/approval/payment controls;
- receipt creation/reconciliation;
- notification delivery/queue state;
- audit event creation for privileged mutations;
- M-Pesa staging callback/idempotency behaviour where applicable.

## 9. Rollback

Application rollback and database rollback are separate concerns.

- Prefer reverting application code to the last known-good commit when the schema remains compatible.
- Do not blindly reverse an applied database migration.
- Use expand-and-contract migrations for breaking changes.
- If a migration introduces irreversible data effects, stop promotion and follow the documented recovery/restore procedure.
- Record the incident, affected tenant scope, financial impact and recovery evidence.

## 10. Operational ownership

| Area | Owner |
|---|---|
| School finance | Bursar |
| Remedial operations | ReClass |
| Teacher compensation | Payroll |
| Payment evidence | Receipts |
| Notifications | Shared service |
| Audit/accountability | Shared service |
| Platform/deployment | Engineering/platform administration |

Deployment controls must preserve these ownership boundaries. UI visibility is not an authorization mechanism; server-side authorization remains the security boundary.

## 11. Historical audit note

`AUDIT-2026-08.md` records an earlier repository audit, including findings that were subsequently addressed. When audit conclusions conflict with current implementation or CI evidence, verify the current branch, migration ledger and runtime environment rather than copying historical status forward.
