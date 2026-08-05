# Contributing to ReClass

This guide reflects the repository audit dated 2026-07-22. ReClass handles multi-tenant student, staff, payment, and communications data. Correct tenant authorization and financial integrity take precedence over delivery speed.

## Prerequisites

- Node.js `22.x`. `package.json` requires `>=22 <23`; `.nvmrc` contains `22`.
- npm, using the committed `package-lock.json`.
- A local or dedicated non-production Supabase project for database-backed work.
- Supabase CLI and Playwright browsers when working on migrations or E2E tests.

```bash
nvm use
node --version
npm ci
```

Use `npm ci`, not `npm install`, when verifying a clean checkout or reproducing CI.

## Environment and Secret Safety

Start from `.env.example` for local Supabase or `.env.production.example` as a variable-name reference. Use local, sandbox, or dedicated test values only.

```bash
cp .env.example .env
```

- Never use production secrets, production credentials, production user passwords, or live customer data for development, tests, screenshots, examples, fixtures, or CI.
- Never commit `.env`, `.env.local`, `.env.*`, secret exports, database dumps, access tokens, private keys, service-role keys, M-Pesa passkeys, Mobiwave tokens, callback secrets, or Sentry auth tokens.
- Values prefixed with `PUBLIC_` are browser-visible. `SUPABASE_SERVICE_ROLE_KEY`, `SECRET_KEY`, `IMPERSONATION_SECRET`, provider credentials, and callback secrets must remain server-only.
- The example JWTs in `.env.example` are Supabase local-development defaults; do not replace them with hosted or production values.
- Keep tenant `school_send` credentials separate from platform `platform_billing` credentials. Platform credentials are never a fallback for a tenant.
- Redact secrets, tokens, phone numbers, student data, payment references, and session cookies from logs, issues, PRs, recordings, and test artifacts.
- If a secret may have been exposed, stop using it, notify a maintainer privately, rotate/revoke it, and remove it from artifacts. Do not merely delete the latest commit.

## Local Development

```bash
npm run dev
```

Before opening a PR, run the current repository gates:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run check` is equivalent to the current Svelte check. `npm run format` writes formatting changes across the repository; inspect its diff and include only intentional changes.

Playwright exists but has no package script as of the audit. Build first because the Playwright web server runs Vite preview:

```bash
npm run build
npx playwright test
```

E2E tests must use dedicated non-production accounts through `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`. The current specification contains fallback credentials; treat that as a test defect and do not rely on them. Never point E2E at production. Install the Chromium test browser locally with `npx playwright install chromium` if needed.

## Branch, Commit, and PR Workflow

1. Create a short-lived branch from the current integration branch, such as `fix/migration-replay` or `feat/notification-claims`.
2. Keep scope narrow. Separate schema/security work, behavior changes, generated artifacts, and unrelated formatting when practical.
3. Rebase or otherwise update from the target branch without rewriting shared history.
4. Use concise imperative commits. Conventional Commit prefixes are preferred: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, and `perf:`.
5. Run all applicable checks and document commands/results in the PR.
6. Open a PR that states the problem, implementation, security/tenant impact, migration and rollback plan, tests, screenshots for UI changes, and remaining risks.
7. Obtain review from a domain owner. Database, auth, tenant, payment, credential, impersonation, or Edge Function changes require security-aware review.
8. Resolve feedback with new commits unless maintainers explicitly request another workflow. Do not force-push shared branches.

Never bypass protected-branch checks, disable hooks, suppress errors, or weaken tests to make a PR pass.

## Coding Style

- Follow TypeScript strict mode and Svelte 5 conventions already used in the repository.
- Prettier uses single quotes, semicolons, two spaces, trailing commas, a 120-column width, and the Svelte/Tailwind plugins.
- ESLint warnings should be treated as work to resolve, not an acceptable target for new code.
- Prefer generated Supabase database types, explicit domain types, Zod validation at untrusted boundaries, and narrow error handling.
- Do not add `any`, `@ts-ignore`, `@ts-nocheck`, or unchecked casts without a documented, reviewed reason and a removal issue.
- Keep browser code free of server-only modules and privileged clients. Keep secrets and authorization decisions out of Svelte client state.
- Put reusable domain queries and mutations in `src/lib/server/`; route loads/actions should authorize, validate, delegate, and shape responses.
- Use bounded queries and deterministic ordering. Paginate user-facing lists; do not depend on Supabase's row cap as pagination.
- Keep financial and multi-write business invariants in transactional, locking, idempotent database functions where appropriate.
- Treat external callbacks, jobs, and messages as retryable and potentially duplicated.
- Log request/event identifiers and operational context, but redact PII, credentials, auth headers, cookies, and provider payload secrets.
- Add comments only where the reason or invariant is not clear from the code.

## Tenant and Security Invariant

The current server commonly uses `locals.srv`, a service-role Supabase client that bypasses RLS. Until the tenant model is redesigned, application filtering is the effective tenant boundary.

Every change must preserve all of these rules:

- Derive user, role, and tenant from the validated server session. Never trust a form field, query parameter, path parameter, browser store, or client-supplied claim as tenant authority.
- Every service-role read, insert, update, delete, count, nested lookup, and referenced-object validation on tenant data must enforce the authoritative `tenant_id`.
- Inserted tenant IDs come from server locals, never request data.
- Parent and teacher access requires ownership/assignment checks in addition to matching the tenant.
- `super_admin` cross-tenant behavior must be explicit, role-checked, narrowly scoped, and audited. Impersonation must be time-limited and auditable.
- Never expose `locals.srv` or `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Never assume current RLS policies protect service-role queries. The audited migration chain contains inconsistent tenant policy mechanisms.
- Validate that every foreign/reference ID belongs to the same tenant before mutation; prefer database-enforced composite tenant relationships.
- Keep payment reconciliation and waiver changes in locking, idempotent RPCs. Preserve immutable financial evidence and auditability.
- Fail closed when authorization, tenant context, callback authentication, or credential resolution is missing or ambiguous.

Any PR that changes a tenant-scoped query must include a negative cross-tenant test, not only a happy-path test.

## Database Migrations

- Add new timestamped SQL files under `supabase/migrations/`.
- Migrations are forward-only. Never edit, reorder, rename, or delete a migration that may have been applied to a shared environment.
- Never repair production only through the SQL Editor. Any emergency SQL must be represented by a reviewed forward migration and change record.
- Make migrations safe for both a clean database and an upgrade from the last deployed state. Rehearse both paths against non-production data.
- Use expand-and-contract for breaking schema changes. Backfills must be bounded, restartable, observable, and accompanied by reconciliation queries.
- Do not add destructive cascades or hard deletes to financial/audit data without an approved retention and migration plan.
- Define both `USING` and `WITH CHECK` behavior where relevant; review grants, owner, `SECURITY DEFINER`, fixed `search_path`, and execute permissions for functions.
- Add constraints for tenant equality and business invariants rather than relying solely on UI validation.
- Regenerate `src/lib/supabase/database.types.ts` only from a successfully migrated schema and include the generated diff.
- Never run unreviewed migrations against production. Backup and restore evidence are required for high-risk tenant or financial migrations.

The required future database gate is two successful clean `supabase db reset` runs, seed execution, final schema assertions, generated-type verification, and role-based tenant-isolation integration tests. This is not enforced by current CI yet and must not be described as passing until implemented.

## Testing

### Current Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test
```

Current CI runs lint, typecheck, Vitest, and build. Playwright is not currently in `.github/workflows/ci.yml`. Existing migration tests inspect SQL text; they do not prove that SQL executes successfully. Existing tenant tests include SQL contract checks but are not a substitute for database-backed cross-tenant tests.

### Test Expectations

- Add unit tests for pure logic, validation, state transitions, and error paths.
- Add integration tests for database constraints, RPCs, policies, grants, triggers, migrations, and provider adapters.
- Add negative authorization tests for role, tenant, ownership, impersonation, and service-role paths.
- Add concurrency and replay tests for payments, waivers, payroll, invoices, callbacks, queues, and reminders.
- Add Playwright coverage for critical login, admin, teacher, bursar, parent, and role-denial flows.
- Use mocks for failure and edge cases and provider sandboxes only for controlled smoke tests. Tests must be deterministic and must not send real SMS or initiate real charges.
- A test must assert meaningful state or output. Assertions such as `count >= 0` or merely checking that a body exists do not demonstrate a feature works.

### Required Future Gates

- Full migration reset/seed/schema/type verification.
- Database-backed RLS and tenant isolation across anon, authenticated roles, parent/teacher ownership, super admin, and service role.
- Critical Playwright flows on staging or protected branches.
- Coverage reporting with at least 80% lines and branches for security- and money-critical modules, plus no project-wide regression.
- Secret scanning, dependency review, `npm audit`, SAST, and staging DAST/ZAP; no unresolved high/critical issue without a time-bound approved exception.
- Automated axe checks with no serious/critical findings, plus manual WCAG 2.1 AA review.
- Performance budgets and production-like load tests for dashboards, exports, STK initiation, and notification throughput.
- Backup restore and disaster-recovery exercises.

## Accessibility and UX

- Target WCAG 2.1 AA across supported desktop and mobile widths.
- Use semantic elements and accessible names before adding ARIA. Every form control needs a persistent label and associated error/help text.
- Ensure complete keyboard operation, visible focus, logical focus order, dialog focus trapping/restoration, and skip/navigation landmarks.
- Meet contrast requirements, support zoom/reflow at 320 CSS pixels, avoid color-only meaning, and respect reduced motion.
- Keep touch targets practical, loading/status announcements understandable, and destructive actions clearly confirmed.
- Test critical flows with automated axe checks, keyboard-only navigation, and at least one screen reader. Verify English and Swahili labels do not overflow or lose meaning.
- Include desktop and mobile screenshots for material UI changes and describe the accessibility checks performed.

## Documentation

- Update user, admin, developer, API, architecture, database, security, deployment, testing, roadmap, and changelog documentation when behavior changes.
- Mark statements as current implementation, target design, or recommendation. Do not claim a migration, deployment, backup, integration, or security control is active without evidence.
- Document environment variable names and purpose, never values.
- Add operator notes for migrations, flags, provider changes, alerts, rollback, and data repair.
- Add an entry under `Unreleased` in root `CHANGELOG.md` for notable user, operator, security, database, and compatibility changes.
- Historical planning/specification changes remain in `docs/CHANGELOG.md`; do not rewrite that history to imply implementation.

## Review Checklist

- [ ] Scope is focused and the PR explains why the change is needed.
- [ ] Node 22 and `npm ci` were used for clean verification.
- [ ] No production secret, credential, customer data, or unredacted PII is present.
- [ ] Server/client boundaries and environment variable visibility are correct.
- [ ] Role, tenant, ownership, and referenced-object checks derive from authoritative server context.
- [ ] Cross-tenant negative tests cover every changed tenant-scoped path.
- [ ] Financial operations remain locking, idempotent, auditable, and safe under retries/concurrency.
- [ ] Migrations are forward-only and tested from clean and upgrade states; generated types are current.
- [ ] Lists are bounded/paginated and query/performance impact was considered.
- [ ] Errors fail closed, logs are redacted, and external calls have timeout/retry/idempotency behavior.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- [ ] Applicable database, E2E, security, accessibility, and performance tests pass or the gap is explicitly documented.
- [ ] UI changes work on desktop/mobile and were checked with keyboard and accessibility tooling.
- [ ] Documentation and `CHANGELOG.md` are updated without unverified readiness claims.
- [ ] Migration, deployment, monitoring, and rollback/roll-forward instructions are clear.

## Reporting Security Issues

Do not open a public issue containing an exploitable tenant-isolation flaw, secret, personal data, or payment vulnerability. Contact the maintainers privately with a minimal reproduction using synthetic non-production data. Do not access another tenant's data or perform testing against production without explicit written authorization.
