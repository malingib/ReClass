# ReClass Roadmap

**Audit baseline:** 2026-07-22  
**Current package version:** `0.2.0`  
**Status convention:** This roadmap distinguishes repository evidence from production state. Presence in source does not prove that a migration, Edge Function, cron job, backup, or deployment is active in production.

## Objectives

1. Make the database and tenant boundary reproducible and enforceable.
2. Protect payment, waiver, payroll, notification, and audit correctness under retries and concurrency.
3. Establish release gates that demonstrate security, accessibility, recoverability, and operational readiness.
4. Complete the product around reliable school operations before introducing premium automation, analytics, monetization, or AI.

## Priority Definitions

| Level | Meaning |
|---|---|
| P0 / Critical | Blocks safe deployment, migration, tenant isolation, or financial correctness |
| P1 / High | Required before broader tenant onboarding or dependable operation |
| P2 / Medium | Material reliability, performance, maintainability, or product gap |
| P3 / Low | Optimization or expansion after evidence and core controls exist |

Effort is a rough engineering estimate for implementation and focused verification, not calendar commitment. Production rollout, data repair, external-provider certification, and UAT may add time.

## Prioritized Technical Debt and Missing Features

| Order | Priority | Item | Severity | Effort | Impact | Dependencies | Completion evidence |
|---:|---|---|---|---|---|---|---|
| 1 | P0 | Establish hosted schema and migration ledger; repair undefined `app.tenant_id()` policies and choose one coherent tenant/RLS model | Critical | 3-7 days | Restores clean environment creation and prevents unsafe blind upgrades | Non-production Supabase environment, hosted schema access, backup | Reviewed schema diff; two clean `supabase db reset` runs; upgrade rehearsal succeeds |
| 2 | P0 | Enforce tenant equality and reduce raw service-role query surface | Critical | 2-4 weeks | Reduces cross-tenant disclosure/mutation risk from one omitted filter | Item 1; table relationship inventory | Composite tenant FKs or equivalent constraints; negative tests for every tenant relationship; privileged access centralized |
| 3 | P0 | Protect financial history and verify ledger invariants | Critical | 1-2 weeks | Prevents payment evidence deletion, duplicate active checkouts, balance drift, and incorrect waivers | Item 1; production-like data fixture | Restrictive financial FKs; concurrent payment/waiver tests; idempotency constraints; zero drift in reconciliation query |
| 4 | P1 | Add executable migration and database integration gates to CI | High | 3-5 days | Detects SQL, policy, grant, extension, trigger, and generated-type drift before merge | Item 1; Supabase CLI/test environment | CI resets and seeds database, asserts schema, tests roles, regenerates and verifies types |
| 5 | P1 | Make notification dequeue and reminder enqueue atomic | High | 1-2 weeks | Prevents duplicate SMS, premature reminder suppression, and ignored retry schedules | Item 1; provider mock/sandbox | Claim/lease or `SKIP LOCKED`; honored `next_retry_at`; idempotency key; DLQ; concurrent worker test |
| 6 | P1 | Require M-Pesa callback authentication/configuration and harden STK saga recovery | High | 1-2 weeks | Reduces forged callback and stranded/duplicate checkout risk | Secret provisioning, Daraja sandbox, item 3 | Fail-closed callback config; expiry/reconciliation job; duplicate request tests; operational runbook |
| 7 | P1 | Resolve deployment ambiguity and automate releases | High | 1 week | Makes builds, rollback, health checks, and environments reproducible | Hosting decision, item 4 | One supported adapter/runtime; immutable artifact; staging promotion; rollback and migration procedure |
| 8 | P1 | Add distributed rate limiting and abuse controls | High | 3-5 days | Keeps limits effective across replicas and restarts | Deployment topology, managed Redis/KV or gateway | Tenant/user/phone keys; bounded storage; 429 tests; monitoring and override procedure |
| 9 | P1 | Define and test backup, PITR, retention, legal hold, and tenant offboarding | High | 1-2 weeks plus exercises | Protects financial and student records and provides recoverability evidence | Hosted access, compliance decisions | Approved RPO/RTO; timed restore; export/anonymization workflow; quarterly exercise record |
| 10 | P1 | Expand audit coverage and make audit records tamper-resistant | High | 1-2 weeks | Improves accountability for privileged and financial mutations | Item 1; event inventory | Mutation matrix; actor/request/tenant metadata; append-only controls; retention policy; audit tests |
| 11 | P2 | Complete pagination and move high-cardinality aggregation to SQL | Medium | 2-3 weeks | Prevents silent 1,000-row truncation and memory/latency growth | Query telemetry and realistic fixtures | Bounded/keyset pagination; query plans; export limits or async export jobs; p95 baselines |
| 12 | P2 | Make notification read state account-backed | Medium | 2-4 days | Synchronizes unread state across devices and bounds local storage | Item 1; notification UX decision | Per-user read model with tenant checks and migration; multi-device test |
| 13 | P2 | Support intentional multi-role selection | Medium | 3-5 days | Removes authorization behavior based on first database row | Auth/RBAC policy and UX | Deterministic active-role selection; role-switch audit; route/action tests |
| 14 | P2 | Finish validation and integrity constraints | Medium | 1 week | Prevents invalid score ranges, periods, session times, and duplicate bulk invoices | Item 1; product rules | DB constraints and transactional RPCs; migration and concurrency tests |
| 15 | P2 | Establish complete observability and dependency-aware health | Medium | 1-2 weeks | Detects DB, cron, queue, provider, and business-flow failures | Deployment decision | Readiness/liveness split; structured logs; metrics/traces; job-lag and payment/SMS alerts; SLO dashboards |
| 16 | P2 | Remove stale generated types, weak `any` boundaries, and direct route data access | Medium | 2-4 weeks incrementally | Improves compile-time safety and makes tenant rules reviewable | Items 1, 2, and 4 | Generated types match schema; typed data layer; no unauthorized raw privileged client use |
| 17 | P2 | Complete accessibility and bilingual coverage | Medium | 2-4 weeks | Meets stated WCAG 2.1 AA and EN/SW goals | Stable core flows and design inventory | Automated axe gate; keyboard and screen-reader pass; contrast/reflow checks; translation completeness |
| 18 | P2 | Complete operational product gaps: consent/STOP, announcements, scheduled reports, offline attendance, and holiday handling | Medium | 1-2 months | Closes documented school workflow requirements | Reliable queue, tenant settings, audit, sync conflict design | UAT acceptance criteria per feature; delivery/consent audit; offline conflict tests |
| 19 | P3 | Add advanced analytics and premium administration | Low | 1-2 months | Enables product differentiation and tenant-level value reporting | Trusted event model, telemetry, billing model | Defined metrics, freshness/quality indicators, plan entitlements, tenant-safe exports |
| 20 | P3 | Introduce constrained AI assistance | Low | 1-2 quarters | May improve prioritization and summaries without automating consequential decisions | Analytics quality, consent, governance, safety gates | Offline evaluation, human review, explanations, monitoring, opt-out, incident and rollback controls |

## Time-Horizon Plan

### First 24 Hours

- Freeze ad hoc production SQL changes until the hosted migration ledger and schema are captured.
- Back up the hosted database and record restore availability before any repair.
- Reproduce the clean migration failure in an isolated Supabase environment.
- Confirm whether callback secrets, cron Vault entries, Edge Function versions, and notification schedules are actually configured; do not place secret values in tickets or logs.
- Open P0 tracking issues with owners and acceptance evidence for migration replay, tenant isolation, and financial correctness.
- Add review guidance that any `locals.srv` query must derive tenant context from validated server locals and scope every operation and referenced-object check.

### First Week

- Implement a forward-only migration that repairs policy creation for deployed environments; validate from both clean state and a production-like upgrade snapshot.
- Decide and document the near-term tenant model: JWT/claim-based RLS with narrow service role is preferred; a centralized privileged API is acceptable if browser table access is denied and database tenant constraints are enforced.
- Add a CI database job using local Supabase: reset, seed, schema assertions, role-based tenant-isolation tests, and generated-type drift check.
- Add concurrent tests for payment reconciliation, waiver grants, active STK requests, and notification claims.
- Select one supported deployment target and remove runtime configuration mutation from the release design.
- Define release ownership, migration approval, rollback triggers, and incident contacts.

### First Month

- Centralize privileged database access and add composite tenant constraints to the highest-risk relationships: invoices/students, payments/invoices, sessions/teachers/subjects, messages/profiles, and exam results.
- Replace notification polling with atomic claims, leases, scheduled retries, idempotency, and a DLQ; make reminder creation transactional with its suppression marker.
- Harden M-Pesa callback configuration, checkout expiry, provider reconciliation, and operational alerting.
- Add distributed rate limiting, readiness checks, queue/job lag monitoring, structured redacted logs, and business-flow alerts.
- Rehearse backup restoration and tenant export/offboarding; approve retention for financial, audit, notification, and student data.
- Enforce unit, integration, migration, and critical E2E gates on protected branches.

### First Quarter

- Complete database-enforced tenant relationships and minimize service-role use.
- Add keyset pagination, SQL aggregation, asynchronous large exports, and production-like performance tests.
- Complete audit coverage and account-backed notification state.
- Add multi-role selection if supported by product policy.
- Meet accessibility and bilingual acceptance criteria on login and the critical admin, teacher, bursar, and parent flows.
- Deliver consent/STOP handling, scheduled reports, and announcements on the hardened notification pipeline.
- Run security assessment, recovery exercise, and tenant-onboarding UAT before expanding beyond controlled pilots.

### First 12 Months

- Operate against explicit SLOs and error budgets; test restore monthly and disaster recovery quarterly.
- Add offline attendance with deterministic conflict resolution and sync audit only after online correctness is stable.
- Add plan entitlements, metering, invoicing, dunning, and tenant usage reporting before premium launch.
- Build trusted analytics definitions, freshness indicators, and cohort/tenant dashboards without exposing cross-tenant data.
- Add read scaling, partitioning, archival, and durable workers only when telemetry demonstrates the threshold.
- Pilot AI recommendations with selected tenants only after the safety requirements below pass; retain human authority for every consequential action.
- Reassess service extraction for payments, notifications, and reporting based on measured scale and ownership needs, not anticipation.

## Refactoring Portfolio

### Quick Refactors

- Add a repository check that rejects browser imports of server-only clients and service-role secrets.
- Replace permissive `any` types in tenant query helpers with generated database types.
- Add explicit limits/pagination to unbounded list queries and remove assertions that can pass without proving behavior.
- Split health into process liveness and dependency-aware readiness.
- Remove test credential fallbacks from E2E behavior; skip with a clear reason when dedicated test credentials are absent.
- Record deployment and migration versions in health/release metadata without exposing secrets.

### Medium Refactors

- Move direct route queries into typed domain services that require authoritative `tenantId` and actor context.
- Introduce transactional database functions for bulk invoice generation and other multi-write invariants.
- Replace device-local notification reads with a tenant/user-scoped table.
- Add a queue claim RPC with lease expiration, attempt policy, idempotency keys, and DLQ transitions.
- Standardize validation and error envelopes across form actions, API handlers, and Edge Functions.
- Replace in-memory report assembly with SQL views/RPCs and cursor-based pagination.

### Major Refactors

- Rebuild tenant authorization around verified JWT claims and coherent RLS, or enforce all data access through a narrow tenant-aware API with composite tenant FKs.
- Establish a clean schema baseline after every known deployed environment has a verified forward upgrade path.
- Replace table polling and split writes with an outbox plus durable worker model for payments, reminders, SMS, and exports.
- Make the web tier stateless and deploy immutable artifacts through one automated pipeline.
- Separate integration workers only when independent scaling and failure isolation justify operational complexity.

## Breaking Changes and Migration Strategy

Likely breaking changes include the tenant/RLS model, financial delete behavior, notification queue schema, notification read storage, role selection, API/error contracts, deployment adapter, and eventual plan entitlements.

### Rules

- Existing migration files are immutable once applied anywhere shared. All fixes are new, timestamped, forward-only migrations.
- Never edit production manually without an equivalent reviewed migration and an incident/change record.
- Use expand-and-contract for schema and API changes: add compatible fields/paths, dual-read or backfill where necessary, switch writers, verify, then remove old behavior in a later release.
- Backfill in bounded, restartable batches with progress and reconciliation queries; never assume a one-shot migration is safe at production volume.
- Treat tenant-boundary and financial changes as high-risk: backup, restore proof, production-like rehearsal, canary tenant, monitoring window, and explicit abort criteria are mandatory.
- Database migrations roll forward. Application rollback must remain compatible with the expanded schema until contraction is complete.
- Regenerate `src/lib/supabase/database.types.ts` from the successfully migrated schema and fail CI on drift.
- Publish operator and tenant-facing notes for behavior, permission, workflow, or data-export changes.

### Baseline/Squash Strategy

Do not squash the current chain as the immediate fix. First repair it forward, inventory every deployed environment, and prove upgrades. A consolidated baseline may be introduced later only for new installations, while preserving the historical chain or a tested bridge for existing installations. Tag the baseline, archive an immutable schema snapshot, and verify baseline-to-current and historical-to-current paths independently.

## Testing Roadmap

| Stage | Required work | Gate |
|---|---|---|
| Now | Keep lint, Svelte typecheck, Vitest, and build green | Existing CI merge gate |
| P0 | Execute full migrations twice, seed, assert final schema/grants/policies/extensions, and verify generated types | Required before database changes merge |
| P0 | Test cross-tenant reads and writes as anon, authenticated roles, parent/teacher owners, super admin, and service role | Zero unauthorized rows or mutations |
| P0 | Test concurrent payment, waiver, active checkout, bulk invoice, callback replay, and notification claim behavior | Exactly-once business effect; safe retry |
| P1 | Run Playwright critical flows with dedicated non-production accounts and provider mocks/sandboxes | Required on protected branches or staging promotion |
| P1 | Add coverage reporting focused on domain and security-critical code | Initial baseline, then at least 80% lines/branches for critical modules; no regression elsewhere |
| P1 | Add `npm audit`, secret scanning, dependency review, SAST, and a staging ZAP baseline | No unresolved critical/high issue without documented time-bound exception |
| P1 | Add axe automation and Lighthouse accessibility checks | No serious/critical axe violations; WCAG 2.1 AA manual sign-off on critical flows |
| P2 | Add k6/load tests for dashboards, exports, queue throughput, and STK initiation using production-like cardinality | Published p95/error-rate/throughput budgets and no silent truncation |
| P2 | Add backup restore, PITR, Edge Function, cron, Vault, and provider degradation exercises | Monthly restore and quarterly recovery evidence |
| P2 | Add contract tests for Daraja and Mobiwave with recorded/redacted fixtures plus sandbox smoke tests | Provider changes detected before production |

## Product and Commercial Recommendations

### Core Product

- Finish reliability and compliance around scheduling, teacher attendance approval, payroll, invoicing, payments, reminders, parent access, and tenant onboarding before broadening scope.
- Add guided tenant onboarding with import validation, credential readiness, role setup, consent configuration, migration status, and a launch checklist.
- Add explicit workflow states, audit views, and recovery actions for failed payments, SMS, imports, and payroll approvals.
- Preserve Kenya-first defaults: KES, Africa/Nairobi, M-Pesa, low-bandwidth responsive UX, and EN/SW completeness.

### Premium Features

- Advanced scheduled reports and branded exports.
- Multi-campus controls, custom roles/approval policies, extended retention, SSO/MFA administration, and delegated support.
- Provider SLA dashboards, priority support, onboarding services, and compliance/export packs.
- Offline attendance and richer academic analytics only after sync and data-quality controls are proven.

Entitlements must be enforced server-side and audited. Never rely on hidden navigation as a plan boundary.

### Automation

- Rules-based reminders with quiet hours, consent, templates, approval thresholds, retry controls, and per-tenant budgets.
- Automated occurrence generation, invoice generation, reconciliation exception queues, payroll preparation, scheduled reports, and credential-expiry alerts.
- Every automation needs idempotency, dry-run/preview where consequential, actor/system attribution, rollback or compensating action, and an operator-visible failure queue.

### Analytics

- Define a governed metric catalog for collection rate, aging, attendance delivery, payroll, notification delivery, and parent engagement.
- Show data freshness, denominator, filters, and completeness; do not present estimates as authoritative totals.
- Use tenant-isolated aggregates and minimum cohort sizes where reports could expose individual student behavior.
- Add anomaly alerts only after baseline quality, seasonality, and false-positive rates are measured.

### Monetization

- Start with transparent school subscriptions and optional onboarding/support services rather than opaque usage charges.
- Model plans around active students, campuses, message allowance, retention, reporting, and support tier; keep payment transaction fees and SMS pass-through explicit.
- Add metering reconciliation, invoice evidence, grace periods, dunning, plan-change proration policy, and entitlement audit before charging.
- Never reuse tenant `school_send` credentials for platform billing. Platform credentials and tenant credentials remain strictly separated.
- Avoid monetizing student data, behavioral profiles, or model outputs.

### AI Recommendations

Potential low-risk starting points are draft monthly summaries, anomaly triage, payment/reminder prioritization, import-column suggestions, and natural-language report filters. AI should not send messages, alter grades, change attendance, reconcile payments, grant waivers, approve payroll, suspend access, or make disciplinary decisions without explicit authorized human confirmation.

#### AI Safety Requirements

- Establish a written purpose, lawful basis, data-flow map, retention policy, and tenant opt-in before processing student, parent, staff, payment, or message data.
- Minimize and pseudonymize inputs; do not train third-party or shared models on tenant data; contractually disable provider training and define regional processing requirements.
- Keep tenant context cryptographically and logically isolated in prompts, retrieval indexes, caches, logs, evaluations, and support tooling.
- Never include service-role keys, provider credentials, raw secrets, or unnecessary PII in prompts, traces, logs, or evaluation datasets.
- Use retrieval allowlists and authorization checks before retrieval, not only after generation. Treat retrieved and user-supplied content as untrusted prompt-injection input.
- Require human review for every external communication and any financial, academic, access, employment, or student-welfare consequence.
- Label AI-generated content and show source data, timestamp, confidence/uncertainty, and an explanation suitable for challenge and correction.
- Test for hallucination, cross-tenant leakage, prompt injection, unsafe recommendations, bias across schools/languages/groups, and degradation in English and Swahili.
- Establish offline benchmarks and acceptance thresholds before pilot; use shadow mode first, then a small reversible rollout with feature flags and per-tenant kill switches.
- Record model/provider/version, authorized actor, inputs or safe references, outputs, decision, and overrides without retaining unnecessary sensitive content.
- Monitor quality, drift, override rates, complaints, latency, cost, and security events; define incident response, deletion, rollback, and provider-exit procedures.
- Provide a non-AI workflow and opt-out. AI failure must not block core school, payment, attendance, or communication operations.

## Exit Criteria for Broader Production Claims

ReClass should not be described as production-ready solely because it builds or has feature-complete source. A broader readiness claim requires, at minimum:

- Verified hosted schema and repeatable clean/upgrade migrations.
- Demonstrated tenant isolation and financial concurrency safety.
- Enforced CI/release gates and supported deployment topology.
- Tested backup/PITR recovery with approved RPO/RTO.
- Operational monitoring for application, database, cron, queue, M-Pesa, and SMS.
- Security, accessibility, and controlled tenant UAT sign-off.
- Runbooks, ownership, incident response, and rollback evidence.
