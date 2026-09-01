# eShule Roadmap

**Last reviewed:** 2026-09-01  
**Current package version:** `0.2.0`  
**Status:** Active development / release-candidate hardening

This roadmap is the delivery plan for **eShule**, the school-operations platform. **ReClass is a domain module for remedial learning and programme operations**, not the name of the whole platform.

## Product direction

eShule connects school administration, teaching and learning, school finance, payroll, ReClass remedial operations, communication, governance, receipts and audit into one tenant-isolated operating platform.

The core operating rule is:

> **User → base role → committee assignment → responsibilities → rights → navigation, dashboards and actions**

The UI communicates responsibility. Server-side authorization is the security boundary.

## Ownership model

| Domain | Operational owner |
|---|---|
| School finance | Bursar |
| Remedial operations | ReClass |
| Teacher compensation | Payroll |
| Actual payment evidence | Receipts |
| Notifications | Shared service |
| Audit/accountability | Shared service |
| Cross-domain administration | School administration / platform administration |

Committee governance remains explicit: teachers deliver and record sessions; committee members/chairman review attendance; the treasurer prepares and initiates remedial payroll; the chairman approves payroll and authorizes payout.

## Delivery sequence

### Phase 1 — Production hardening

- Replay the complete Supabase migration chain from an empty database.
- Verify hosted migration ledger and schema drift.
- Execute tenant-isolation tests against a real database.
- Verify financial idempotency, reconciliation and same-tenant foreign-key invariants.
- Verify payroll domain separation and payout state transitions.
- Validate M-Pesa callback authentication and retry/replay behaviour.
- Verify notification queue, retry and audit behaviour.
- Complete CI gates for lint, typecheck, unit tests, build, migrations, Edge Functions and critical E2E journeys.

**Exit evidence:** clean migration replay, tenant negative tests, financial concurrency/idempotency tests, green CI and staging smoke evidence.

### Phase 2 — Operational readiness

- Maintain separate staging and production Vercel/Supabase environments.
- Version deployment configuration and remove obsolete deployment paths.
- Establish backup/PITR verification and restore drills.
- Define readiness/liveness probes and redacted structured logging.
- Monitor payment reconciliation, notification queues, provider failures and job lag.
- Document incident response, rollback and migration compatibility rules.
- Verify secret rotation and environment ownership.

**Exit evidence:** staging promotion, rollback rehearsal, restore rehearsal and operational runbook sign-off.

### Phase 3 — Critical journey completion

- Teacher Today: attendance, teaching, remedial and committee actions according to rights.
- Principal Command Center: oversight without assuming Bursar or committee operational ownership.
- Bursar Finance Center: fees, payments, reconciliation and financial evidence.
- Payroll: salary, allowances, remedial payments, committee payments and role-specific compensation.
- Receipts: clear payment evidence and traceability.
- Parent journey: child ledger, balances and Pay Now flow.
- Communication: composer, templates, delivery state and account-backed notification state.
- Accessibility, responsive behaviour and empty/error states across critical screens.

**Exit evidence:** role-based UAT with representative school workflows and no unauthorized actions exposed or executable.

### Phase 4 — Scale and maintainability

- Replace unbounded reads with cursor/keyset pagination.
- Move high-cardinality dashboard aggregates into SQL.
- Add tenant-aware indexes and query-plan review.
- Bound imports/exports and move large exports to asynchronous jobs.
- Add provider timeouts, retry policies and circuit-breaker behaviour.
- Remove stale code, weak `any` boundaries and duplicated utilities.
- Consolidate design tokens where practical without breaking the existing bits-ui/app surface contract.

**Exit evidence:** production-like load/soak tests, performance budgets and measurable query/resource limits.

### Phase 5 — Controlled commercial expansion

- Guided tenant onboarding and suspension/offboarding.
- Data export, retention and deletion workflows.
- Consent/STOP handling, announcements and scheduled reports.
- Offline attendance and sync-conflict handling where required.
- Governed analytics with freshness and data-quality indicators.
- Server-enforced plans, metering, billing evidence and entitlement audit.

**Exit evidence:** pilot UAT, support procedures, retention/export evidence and governed commercial controls.

### Phase 6 — Intelligent platform evolution

Potential first uses:

- draft summaries;
- anomaly triage;
- import suggestions;
- natural-language report filters.

AI must remain out of autonomous decisions involving grades, attendance, payments, waivers, payroll, access or student welfare. Any AI feature requires tenant opt-in, data minimization, evaluation, human confirmation, cost controls and a kill switch.

## Current priorities

| Priority | Work | Gate |
|---|---|---|
| P0 | Migration replay + hosted schema verification | Empty-database replay and upgrade rehearsal |
| P0 | Tenant isolation verification | Cross-tenant negative suite passes |
| P0 | Financial integrity | Idempotency/concurrency/reconciliation suite passes |
| P1 | CI and release gates | All required checks automated |
| P1 | Deployment/operations | Staging-to-production promotion and rollback proven |
| P1 | Critical role journeys | Teacher, Principal, Bursar, Payroll, ReClass and Parent UAT |
| P2 | Pagination/performance | Production-like load evidence |
| P2 | Accessibility/bilingual completion | Critical-flow accessibility and localization sign-off |
| P2 | Notification/read-state maturity | Account-backed state + reliable retry/queue behaviour |
| P3 | Advanced analytics/commercial features | Trusted metrics and entitlement model |
| P3 | Constrained AI | Safety evaluation + opt-in pilot |

## Decision rules

1. Security, tenant isolation, financial correctness and recoverability outrank feature expansion.
2. A feature is not complete because source code exists; its critical journey and failure states must be tested.
3. A role must not inherit rights merely because it can see a page.
4. A domain owner must not silently absorb another domain's responsibilities.
5. Database invariants should be enforced at the database boundary where practical, not only in UI code.
6. Breaking schema changes use expand-and-contract and a tested forward/rollback strategy.
7. No microservice, sharding or AI initiative should be used to compensate for missing fundamentals.

## Historical audits

Detailed dated audits such as [`AUDIT-2026-08.md`](AUDIT-2026-08.md) are historical evidence. They should remain useful for traceability but must not be copied into current status documents without re-verification.
