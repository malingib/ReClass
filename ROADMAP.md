# eShule Roadmap

**Last reviewed:** 2026-09-09  
**Current package version:** `0.2.0`  
**Status:** Active development / release-candidate hardening

This roadmap is the delivery plan for **eShule**, the school-operations platform. **ReClass is the remedial learning and programme-management module within eShule**, not the name of the whole platform.

## Product direction

eShule connects school administration, student lifecycle, teaching operations, school finance, payroll, ReClass remedial operations, communication, governance, receipts and audit into one tenant-isolated operating platform.

## Delivery status

### Completed foundation — Student Operations

The current `main` branch contains the integrated operational sequence:

- Admissions intake and admission decisions.
- Enrollment and class/stream placement with historical records preserved.
- Student lifecycle and dated history.
- Retention/history records and follow-up outcomes.
- Graduation and exit records.
- ReClass remedial programmes, cohorts, sessions, attendance and progress workflows.
- School calendar and operational events.
- Lesson management for teacher/class/subject/date/time/room scheduling.
- Teacher tasks and operational reminders.
- Shared visual dashboard/reporting surfaces and responsive application shell.

**Completion evidence:** repository CI is green for lint, static tenant-isolation checks, type checking, tests, production build, local Supabase startup, migration replay and database cross-tenant isolation.

### Current phase — Release-candidate hardening

- Hosted Supabase migration and schema verification.
- Live tenant-isolation and authorization verification.
- Payment and notification provider sandbox/callback testing.
- Role-based UAT across admissions, enrollment, lifecycle, ReClass, calendar, lessons, finance and parent journeys.
- Accessibility and responsive QA.
- Empty/loading/error state review.
- E2E execution in a configured non-production environment.
- Backup/restore rehearsal and rollback verification.
- Observability and incident-response verification.
- Production deployment configuration and release gates.

### Next product phase — Leadership, finance & parent journeys

- Principal Command Center.
- Bursar Finance Center.
- Fees, payments and reconciliation hardening.
- Payroll and teacher compensation hardening.
- Receipts as actual-payment evidence.
- Parent child ledger and Pay Now M-Pesa journey.
- Communication composer, templates and delivery state.

Existing implementations in these areas should be hardened and verified before adding broad new product scope.

### Controlled commercial expansion

- Guided tenant onboarding and suspension/offboarding.
- Data export, retention and deletion workflows.
- Consent/STOP handling and scheduled reports.
- Offline attendance and sync-conflict handling where required.
- Governed analytics with freshness and data-quality indicators.
- Server-enforced plans, metering, billing evidence and entitlement audit.

### Intelligent platform evolution

Potential first uses:

- draft summaries;
- anomaly triage;
- import suggestions;
- natural-language report filters.

AI must remain out of autonomous decisions involving grades, attendance, payments, waivers, payroll, access or student welfare. Any AI feature requires tenant opt-in, data minimization, evaluation, human confirmation, cost controls and a kill switch.

## Product boundaries

The current delivery sequence intentionally excludes:

- screening;
- discipline as a new product workflow;
- homework;
- assignments;
- markbook;
- LMS/online classes;
- learning-resource/library systems;
- clubs and activities.

Existing historical data/code may remain where required for compatibility, but no new scope should be added in these areas without an explicit product decision.

## Decision rules

1. Security, tenant isolation, financial correctness and recoverability outrank feature expansion.
2. A feature is not complete because source code exists; its critical journey and failure states must be tested.
3. A role must not inherit rights merely because it can see a page.
4. A domain owner must not silently absorb another domain's responsibilities.
5. Database invariants should be enforced at the database boundary where practical, not only in UI code.
6. Breaking schema changes use expand-and-contract and a tested forward/rollback strategy.
7. No microservice, sharding or AI initiative should compensate for missing fundamentals.
8. Current root documentation describes the active implementation; dated audit material is historical evidence unless explicitly superseded.
