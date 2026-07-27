# Changelog

All notable implementation and repository changes should be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project intends to use [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Repository evidence does not by itself verify production deployment or readiness.

Historical planning and specification entries are retained in [`docs/CHANGELOG.md`](docs/CHANGELOG.md). That file includes earlier planning-era version labels and stack assumptions and should not be treated as an implementation release ledger.

## [Unreleased]

### Added

- Repository-audit documentation dated 2026-07-22:
  - `ROADMAP.md` prioritizes migration reproducibility, tenant isolation, financial correctness, reliable notifications, testing, operations, product expansion, and AI safety.
  - `CONTRIBUTING.md` defines Node 22 setup, secret safety, tenant/security invariants, forward-only migrations, review workflow, testing expectations, accessibility, and documentation requirements.
  - Root `CHANGELOG.md` establishes an implementation-oriented Keep a Changelog ledger and links historical documentation.
- Forward-compatibility migration `20260722000008_fix_app_tenant_id_helper.sql` providing `app.tenant_id()` for environments that applied the earlier references.
- `.dockerignore` for production Docker builds.

### Changed

- Credential save now calls `encrypt_credential` RPC server-side before storing, with provider-specific JSON schema validation (M-Pesa: consumer_key, consumer_secret, passkey, shortcode; Mobiwave: api_token).
- Migration files `20260722000006_create_messages.sql` and `20260722000007_create_exams.sql` now use `current_setting('app.tenant_id', true)::uuid` instead of undefined `app.tenant_id()`.
- Student import now allowlists fields (admission_no, first_name, last_name, grade, status) and enforces a 500-record batch limit.
- Academic enrichment queries in exam view and parent academic report now include tenant predicates on subject and student lookups.
- Parent messaging now validates teacher existence, tenant membership, and profile_id resolution for new conversations; existing conversations require participant proof via prior sent message.
- Academic result replacement now validates the Zod schema, verifies exam tenant membership, and checks that all student and subject IDs belong to the tenant before the delete-and-insert cycle.
- Dockerfile now adds a non-root user, copies production node_modules to runtime, and adds `.dockerignore`.
- M-Pesa callback now enforces the callback secret (fail-closed when absent), validates method is POST, limits body size to 10KB, and prefers the original checkout amount over the callback-supplied amount.
- SMS worker (notify) now atomically claims queued rows (status → 'processing'), respects `next_retry_at`, adds a 10-second fetch timeout, and caps batch size at 50.
- Payment reminders now check parent `sms_consent` before enqueuing and verify the optimistic-lock update affected a row.

### Security

- Documented the current critical invariant that service-role server queries bypass RLS and must scope all tenant operations and referenced-object checks with authoritative server-derived tenant context.
- Documented that production secrets and production customer data must never be used in development, tests, CI, fixtures, examples, screenshots, or logs.
- Credential plaintext is no longer stored directly; provider JSON is validated and encrypted via `encrypt_credential` RPC before being written to `encrypted_blob`.
- M-Pesa callback authentication is now mandatory; `MPESA_CALLBACK_SECRET` must be configured or the endpoint returns 500.
- Parent message recipient is now derived from the teacher's `profile_id` rather than accepting arbitrary profile UUIDs; existing conversations require sender participation history.

## [0.2.0] - 2026-07-22

### Added

- SvelteKit 2 and Svelte 5 application routes for six roles: super admin, school admin, principal, teacher, bursar, and parent.
- Operational workflows represented in the repository for tenant administration, students, guardians, teachers, subjects, scheduling, teacher attendance, payroll, fees, invoices, waivers, reports, notifications, messaging, and exam results.
- Supabase PostgreSQL migrations, generated database types, seed SQL, Auth/PostgREST integration, and Edge Functions for M-Pesa and Mobiwave workflows.
- M-Pesa STK initiation and callback/reconciliation code, including locking/idempotency mechanisms in database functions.
- Mobiwave SMS queue/worker, payment-reminder, credential-test, and cron-related code.
- Domain-oriented server modules for ownership, querying, invoices, attendance, dashboards, students, payroll, credentials, scheduling, waivers, CSV output, rate limiting, and impersonation.
- Sentry client/server configuration, request handling, health endpoint, Docker packaging, Playwright configuration, Vitest tests, linting, strict Svelte type checking, and GitHub Actions CI.
- Root implementation audits `ARCHITECTURE.md`, `DATABASE.md`, and `FINAL_REPORT.md`, alongside the historical documentation under `docs/`.

### Changed

- The implemented application stack is SvelteKit/Svelte rather than the earlier Next.js planning assumptions recorded in parts of `docs/`.
- Tenant isolation for server-side service-role access is primarily enforced through explicit application query filters and ownership checks; RLS is not an effective defense for service-role queries.
- Scheduling and attendance evolved toward direct whole-class sessions and teacher-delivery attendance, with older student-attendance and remedial-group structures removed or superseded by later migrations.
- Several large route handlers were moved toward shared server domain modules, though direct route-level database access remains.

### Security

- Server hooks validate Supabase users, resolve roles/tenants, apply route guards, and support signed super-admin impersonation cookies; impersonation audit/revocation remains incomplete.
- Tenant/provider credential separation and server-only service-role usage are represented in code and migrations.
- Payment and waiver database functions include tenant parameters, row locking, validation, and restricted execution patterns.

### Known Limitations

- The hosted schema, applied migration ledger, deployed Edge Function versions, cron configuration, backup/PITR state, and provider configuration were not verified by the repository audit.
- Service-role access bypasses RLS, so an omitted tenant filter can expose or mutate another tenant's data; tenant equality is not database-enforced across all relationships.
- Current CI runs lint, typecheck, Vitest, and build, but does not execute migrations, database-backed tenant-isolation tests, Playwright, accessibility checks, security scans, coverage thresholds, or restore exercises.
- Deployment configuration supports conflicting Vercel and Docker/Node paths, and no repository-defined automated production deployment or infrastructure-as-code workflow was verified.
- Database types and some historical documentation are stale or inconsistent with the intended final schema and current implementation.
- Observability, dependency-aware readiness, distributed rate limiting, retention/offboarding, audit completeness, accessibility evidence, and disaster-recovery proof remain incomplete.

This summary describes code and configuration observed in the repository on 2026-07-22. It does not claim that version `0.2.0` is deployed, migration-complete, secure for unrestricted multi-tenant production use, or operationally production-ready.
