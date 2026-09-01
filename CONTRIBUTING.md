# Contributing to eShule

This repository contains eShule, a multi-tenant school-operations platform. ReClass is the remedial learning and programme-management module within it.

Correct tenant authorization, separation of responsibilities and financial integrity take precedence over delivery speed.

## Prerequisites

- Node.js `22.x` (`package.json` requires `>=22 <23`).
- npm with the committed `package-lock.json`.
- A local or dedicated non-production Supabase project for database-backed work.
- Supabase CLI and Playwright browsers when working on migrations or E2E tests.

```bash
nvm use
node --version
npm ci
```

Use `npm ci` when verifying a clean checkout or reproducing CI.

## Environment and secret safety

Start from `.env.example` and use only local/sandbox/test values.

```bash
cp .env.example .env
```

Never commit production secrets, customer data, access tokens, private keys, service-role keys, M-Pesa credentials, Mobiwave tokens, callback secrets or Sentry auth tokens.

Keep tenant `school_send` credentials separate from platform `platform_billing` credentials. Platform credentials are never a tenant fallback.

Redact credentials, auth headers, cookies, full phone numbers, student data and payment-sensitive identifiers from logs, issues, PRs, recordings and test artifacts. If exposure is suspected, revoke/rotate the credential and notify a maintainer privately; deleting a commit is not sufficient remediation.

## Local development

```bash
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For browser tests:

```bash
npm run build
npx playwright install chromium
npx playwright test
```

E2E tests must use dedicated non-production accounts and environments. Never point tests at production.

## Branch, commit and PR workflow

1. Create a short-lived branch from the current integration target.
2. Keep scope narrow and separate unrelated formatting from behavioral changes.
3. Use concise Conventional Commit prefixes such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:` and `perf:`.
4. Run applicable checks and record commands/results in the PR.
5. Explain business impact, security/tenant impact, migrations, rollback, tests and remaining risks.
6. Database, auth, tenant, payment, credential, payroll or Edge Function changes require security-aware review.
7. Never bypass protected-branch checks, weaken tests or force-push shared branches.

## Coding standards

- Follow TypeScript strict mode and Svelte 5 conventions.
- Reuse shared UI components and design tokens.
- Prefer generated Supabase types and explicit domain types.
- Validate untrusted input with Zod or an equivalent server-side schema.
- Avoid `any`, `@ts-ignore`, `@ts-nocheck` and unchecked casts unless a reviewed exception exists.
- Keep browser code free of server-only modules and privileged clients.
- Route loads/actions should authorize, validate, delegate to shared server/domain logic and shape responses.
- Use bounded, deterministic queries and pagination for user-facing lists.
- Put multi-write financial and authorization invariants behind transactional/idempotent database functions where appropriate.
- Treat callbacks, jobs and messages as retryable and potentially duplicated.
- Log safe identifiers and operational context, never secrets or unnecessary PII.

## Responsibility and authorization invariant

The product model is:

```text
User -> Base role -> Functional / committee assignment
     -> Responsibilities -> Rights / capabilities
     -> Navigation -> Dashboard -> Allowed actions
```

The UI is not a security boundary. Every privileged mutation must be independently authorized server-side.

Maintain these boundaries:

- **Bursar** owns school finance.
- **ReClass** owns remedial programme operations.
- **Payroll** owns teacher compensation, allowances and role-specific payments.
- **Receipts** document actual payments.
- **Notifications and audit** are shared services.
- **Principal** provides oversight and explicitly assigned approvals.
- Teacher `teacher_type` (`classroom`, `remedial`, `both`) is separate from `remedial_role` governance assignment.
- Generic teaching access must not grant committee approval rights.

## Tenant and security invariant

Every change touching tenant data must:

- derive tenant context from the verified server session;
- enforce tenant ownership on primary and referenced records;
- never accept a request field as tenant authority;
- keep service-role usage narrow and explicitly tenant-scoped;
- apply ownership/assignment checks for parent and teacher data;
- keep super-admin cross-tenant actions explicit and audited;
- protect credentials and never use platform credentials as tenant fallbacks;
- preserve payment reconciliation idempotency and financial evidence;
- fail closed when authorization or tenant context is missing.

Any PR changing a tenant-scoped query should include a negative cross-tenant test.

## Database migrations

- Add timestamped SQL migrations under `supabase/migrations/`.
- Migrations are forward-only; do not edit applied/shared migrations.
- Rehearse migrations against both clean and production-like upgrade states.
- Use expand-and-contract for breaking changes.
- Add database constraints for important tenant and business invariants.
- Review function ownership, `SECURITY DEFINER`, fixed `search_path`, grants and execute permissions.
- Regenerate database types only from the successfully migrated schema.
- Never use ad hoc production SQL as a substitute for a reviewed migration.

## Testing expectations

Add tests for:

- tenant isolation and cross-tenant denial;
- capability/role/committee authorization;
- payment reconciliation and callback replay;
- payroll domain/period uniqueness and approval separation;
- receipt/payment evidence integrity;
- notification retry/idempotency behavior;
- migrations, constraints, RPCs and triggers;
- critical teacher, parent, Bursar, Principal, admin and ReClass journeys;
- keyboard/accessibility and responsive behavior for material UI changes.

The testing strategy in `docs/testing.md` defines the broader release gates. A documented target is not evidence that the gate has already passed.

## Documentation

When behavior changes, update the smallest authoritative documentation set needed to keep code and docs aligned:

- `README.md` — entry point
- `ARCHITECTURE.md` — system architecture
- `API.md` — implemented interface contract
- `SECURITY.md` — security model and release blockers
- `DEPLOYMENT.md` — supported deployment path
- `OPERATIONS.md` — operational procedures
- `ROADMAP.md` — delivery priorities
- `CHANGELOG.md` — notable implementation changes
- `docs/` — detailed product/design/testing/integration references

Distinguish **implemented**, **target**, **planned** and **unverified production** states. Never document a migration, backup, deployment, provider integration or security control as active without evidence.

## Review checklist

- [ ] Scope is focused and the PR explains the reason for change.
- [ ] `npm ci` and Node 22 were used for clean verification.
- [ ] No secrets or unredacted sensitive data are present.
- [ ] Browser/server boundaries are correct.
- [ ] Role, tenant, ownership and referenced-object checks are server-authoritative.
- [ ] Cross-tenant negative tests cover changed tenant paths.
- [ ] Financial operations remain idempotent, auditable and concurrency-safe.
- [ ] Migrations are forward-only and tested.
- [ ] Queries are bounded/paginated.
- [ ] External calls have safe timeout/retry behavior.
- [ ] Lint, typecheck, tests and build pass.
- [ ] Applicable database/E2E/security/accessibility/performance checks pass or the gap is explicitly documented.
- [ ] UI changes work on desktop/mobile and preserve keyboard accessibility.
- [ ] Documentation and changelog are synchronized.

## Reporting security issues

Do not open a public issue containing a tenant-isolation flaw, secret, personal data or payment vulnerability. Contact maintainers privately with a minimal reproduction using synthetic non-production data. Never access another tenant's data or test production without explicit authorization.
