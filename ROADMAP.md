# eShule Roadmap

**Last reviewed:** 2026-09-08  
**Current package version:** `0.2.0`  
**Status:** Active development / release-candidate hardening

This roadmap is the delivery plan for **eShule**, the school-operations platform. **ReClass is a domain module for remedial learning and programme operations**, not the name of the whole platform.

## Product direction

eShule connects school administration, teaching and learning, school finance, payroll, ReClass remedial operations, communication, governance, receipts and audit into one tenant-isolated operating platform.

## Delivery sequence

### Phase 1 — Production infrastructure

- Supabase migration chain and hosted schema verification.
- Tenant-isolation and financial integrity verification.
- Native Postgres scheduling for database-only jobs.
- Edge Functions for external payment and messaging integrations.
- CI/CD and production deployment gates.

**Exit evidence:** clean migrations, green CI, hosted verification and staging smoke evidence.

### Phase 2 — Admissions & student lifecycle

- Admissions intake.
- Enrollment and class placement.
- Guardian linkage.
- Student profile and operational record.
- Lifecycle timeline: admission, enrollment, class movement, transfer, completion, withdrawal and reactivation.
- Auditable lifecycle events and role-controlled actions.

### Phase 3 — Teaching & ReClass operations

- Teacher Today workspace.
- Class rosters and attendance.
- Lesson/session management.
- ReClass remedial sessions and attendance.
- Remedial committee responsibilities according to assigned rights.
- Teacher tasks and automated reminders.
- School calendar and operational deadlines.

### Phase 4 — Leadership, finance & parent journeys

- Principal Command Center.
- Bursar Finance Center.
- Fees, payments and reconciliation.
- Payroll and teacher compensation.
- Receipts as actual-payment evidence.
- Parent child ledger and Pay Now M-Pesa journey.
- Communication composer, templates and delivery state.

### Phase 5 — Production QA & scale

- Role-based UAT across the complete school workflow.
- Accessibility and responsive QA.
- Empty/error/loading states.
- Payment and notification end-to-end tests.
- Tenant-isolation negative tests.
- Pagination and high-cardinality query review.
- Backup/restore rehearsal and rollback verification.
- Observability, incident response and release gates.

### Phase 6 — Controlled commercial expansion

- Guided tenant onboarding and suspension/offboarding.
- Data export, retention and deletion workflows.
- Consent/STOP handling and scheduled reports.
- Offline attendance and sync-conflict handling where required.
- Governed analytics with freshness and data-quality indicators.
- Server-enforced plans, metering, billing evidence and entitlement audit.

### Phase 7 — Intelligent platform evolution

Potential first uses:

- draft summaries;
- anomaly triage;
- import suggestions;
- natural-language report filters.

AI must remain out of autonomous decisions involving grades, attendance, payments, waivers, payroll, access or student welfare. Any AI feature requires tenant opt-in, data minimization, evaluation, human confirmation, cost controls and a kill switch.

## Current execution order

**Admissions & enrollment → Student lifecycle → ReClass/remedials → School calendar & lessons → Teacher command center → Principal command center → Bursar/finance → Parent Pay Now → Production QA.**

Discipline is intentionally **not part of the current delivery sequence**. Existing data/code is preserved unless explicitly scheduled for removal; no new discipline scope should be added while this sequence is being completed.

## Decision rules

1. Security, tenant isolation, financial correctness and recoverability outrank feature expansion.
2. A feature is not complete because source code exists; its critical journey and failure states must be tested.
3. A role must not inherit rights merely because it can see a page.
4. A domain owner must not silently absorb another domain's responsibilities.
5. Database invariants should be enforced at the database boundary where practical, not only in UI code.
6. Breaking schema changes use expand-and-contract and a tested forward/rollback strategy.
7. No microservice, sharding or AI initiative should compensate for missing fundamentals.
