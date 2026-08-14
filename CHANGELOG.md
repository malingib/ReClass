# Changelog

All notable implementation and repository changes should be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project intends to use [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Repository evidence does not by itself verify production deployment or readiness.

Historical planning and specification entries are retained in [`docs/CHANGELOG.md`](docs/CHANGELOG.md). That file includes earlier planning-era version labels and stack assumptions and should not be treated as an implementation release ledger.

## [Unreleased]

### Added

- Platform Settings page in the super-admin area (`/super-admin/settings`): platform admin owners manage the operator's own M-Pesa/Mobiwave credentials (`scope='platform'`, `platform_billing`) and platform-wide config.
- `platform_config` table storing `mpesa_callback_secret` and `public_url` encrypted at rest, managed by super-admins, with `get_platform_config`/`set_platform_config` RPCs (service-role only) and a dedicated `decrypt_platform_credential` RPC for platform-scope decrypt that does not depend on session context (migration `20260812000005`).
- Edge functions `mpesa-callback`, `b2c-result`, `stk`, and `b2c` now resolve `MPESA_CALLBACK_SECRET`/`PUBLIC_URL` from platform config with Deno env fallback (env wins when present); `b2c` and `stk` fail closed when the base URL is missing.

- Remedial committee hats (`chairman`/`treasurer`/`member`/`none`) on `teachers`, canonical per-tenant `terms` table with `tenants.current_term_id`, and a `set_current_term` RPC that atomically flips the current term (migration `20260812000001`/`20260812000003`).
- Teacher B2C payout identity (`phone`, `id_number`) plus an M-Pesa credential blob schema now requiring `initiator_name` and `security_credential` for Daraja B2C disbursements (validated at save time).
- Real Daraja B2C payout flow: `claim_payroll_run` (atomic approved→processing, treasurer/school_admin gate, idempotent checkout id) and `finalize_payroll_b2c` (idempotent paid/failed terminal transition) in migration `20260812000003`; `payroll_runs` gained the full `pending/processing/failed` lifecycle with `b2c_checkout_id`, `b2c_status`, `last_error`, `processing_at`, `mpesa_receipt` and once-processing/idempotency CHECKs (migration `20260812000002`).
- Edge functions `b2c` (pre-flight checks before Daraja, credential `shortcode` as PartyA mirroring STK, returns `processing`/`rejected`) and `b2c-result` (fail-closed `MPESA_CALLBACK_SECRET`, idempotent finalize, teacher payout SMS).
- Remedial SMS triggers: session-allocation alert, `reclass-session-reminders` and `reclass-payment-reminders` cron jobs, all deduplicated via `external_id` (migration `20260812000004`).
- Committee portal at `/teacher/committee` (attendance review for chairman/member; payroll generate/approve/pay for treasurer/chairman); admin remedial payroll page now shows pending/processing/paid/failed with generate/approve/pay actions.
- Settings page gained Academic Terms (create/set-current/delete), Remedial Committee Roles, and Integrations (M-Pesa + Mobiwave credentials, encrypted at rest) tabs; `sms_teacher_payout` toggle added to SMS toggles. The separate `/admin/credentials` page was removed in favour of Settings > Integrations.
- `teachers` CRUD now exposes committee role, M-Pesa phone, and National ID on create/edit.

### Changed

- `review_teacher_attendance` now accepts the committee chairman (or member) alongside the principal.
- B2C pre-flight rejects payout requests that lack a resolvable credential, initiator identity, valid teacher phone/ID, or a positive amount — failures are persisted as `status='failed'` + `last_error` rather than silently rolled back.
- M-Pesa party identification unified: both STK and B2C use the credential blob `shortcode`; `tenants.mpesa_paybill` remains a display-only settings field.

### Security

- Credential save-time validation now requires `initiator_name` + `security_credential` for M-Pesa blobs, so B2C never fails late on missing initiator identity; blobs remain encrypted via `encrypt_credential` RPC.
- New RPCs (`claim_payroll_run`, `finalize_payroll_b2c`, `set_current_term`) are revoked from anon/authenticated and granted only to `service_role`; payroll claims are gated on treasurer/school_admin role inside the RPC.
- B2C result callback fails closed when `MPESA_CALLBACK_SECRET` is unset.

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
- `platform_config` values (callback secret, public URL) are encrypted with the same vault KEK as credentials; `get_platform_config`/`set_platform_config`/`decrypt_platform_credential` are service-role-only.
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
