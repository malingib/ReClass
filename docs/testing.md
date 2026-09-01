# eShule — Testing & Verification Strategy

> **Current-state testing reference — 1 September 2026.** Tests prove implementation behavior; source files or documentation alone do not prove deployment readiness.

## 1. Verification layers

1. **Static/type checks** — SvelteKit sync, TypeScript/Svelte checking and linting.
2. **Unit tests** — pure domain logic, validation, authorization helpers and financial calculations.
3. **Database integration tests** — migrations, constraints, RPCs, triggers, RLS and tenant isolation against a real Supabase/Postgres test environment.
4. **End-to-end tests** — critical journeys through the actual application: authentication, teacher delivery, ReClass governance, parent payment, Bursar finance, Payroll and receipts.
5. **Accessibility tests** — automated axe/Lighthouse checks plus keyboard and assistive-technology review.
6. **Security tests** — dependency/security scanning, authorization-negative tests, secret handling and privileged-operation review.
7. **Performance tests** — realistic tenant/data volumes, bounded queries, pagination and critical workflow latency.
8. **Recovery tests** — backup restore, migration upgrade/rollback rehearsal and provider/queue failure recovery.

## 2. Critical business invariants

The following must have executable tests:

- tenant A cannot read or mutate tenant B data;
- server-side capability checks cannot be bypassed by hiding/showing UI;
- teacher type and remedial governance assignment remain distinct;
- only authorized committee members can approve attendance;
- Treasurer/Chairman payroll responsibilities remain separated;
- Bursar school-finance ownership remains separate from ReClass operations;
- payroll components and runs are tenant/domain scoped;
- payment reconciliation is idempotent;
- duplicate provider callbacks cannot create duplicate accounting events;
- receipts represent actual payment evidence;
- referenced records in privileged mutations belong to the same tenant;
- notification retries do not create unintended duplicate sends.

## 3. Minimum critical E2E journeys

### Teacher
Login → today's work → assigned session → attendance/delivery → submit → status/approval feedback.

### ReClass committee
Login → governance queue → eligible attendance review → approve/reject → audit evidence.

### Bursar
Login → finance centre → outstanding fees → payment/reconciliation → waiver where permitted → receipt/evidence.

### Parent
Login → linked child → outstanding balance → allowed payment action → payment result → receipt/ledger.

### Payroll
Eligible components → payroll run → required approval → payout initiation by authorized operator → payment evidence.

### Administration
Create/update staff and student records → assign roles/teacher type/committee hat → verify derived navigation and denied actions.

## 4. Database isolation tests

Use at least two tenants in an integration environment. For every high-risk relationship, test both:

- legitimate same-tenant access succeeds;
- attacker-controlled cross-tenant identifiers return denial, no rows, or a controlled error and create no mutation.

Prioritize students, guardians, teachers, sessions, attendance, invoices, payments, receipts, payroll, notifications, audit records and credentials.

## 5. Financial correctness tests

Cover:

- positive payment amounts;
- amount cannot exceed the permitted balance unless an explicit credit/overpayment policy exists;
- duplicate checkout identifiers are idempotent;
- same checkout with conflicting amount/tenant is rejected;
- concurrent settlement cannot double-credit an invoice;
- receipt/payment evidence is created once;
- waivers cannot produce negative or impossible balances;
- payroll generation cannot duplicate a tenant/teacher/period/domain run;
- payout state changes occur only after the upstream response is known and valid.

## 6. Authorization tests

For every privileged action test at least:

- authorized actor succeeds;
- same-tenant unauthorized actor is denied;
- cross-tenant actor is denied;
- missing/expired identity is denied;
- UI omission does not matter because the server remains authoritative.

## 7. CI release gates

A release candidate should not be promoted until the repository has evidence for the applicable gates:

- dependency installation succeeds;
- lint succeeds;
- typecheck succeeds;
- unit tests succeed;
- database migrations replay cleanly;
- tenant-isolation suite succeeds;
- critical E2E suite succeeds;
- accessibility checks pass agreed thresholds;
- security scans have no unaccepted critical/high finding;
- build succeeds using the supported deployment path.

Do not claim a gate passed when the corresponding environment or provider integration was not actually exercised.

## 8. Test-data rules

- Never commit real student, parent, teacher or payment data.
- Use deterministic synthetic tenants and records for integration tests.
- Provider sandbox credentials belong only in protected CI/environment configuration.
- Tests must not log secrets, tokens, full phone numbers or sensitive student information.

## 9. Failure evidence

When a test fails, record:

1. exact commit/environment;
2. failing test and reproducible input;
3. expected versus actual behavior;
4. security/data impact;
5. remediation and regression test;
6. whether production is affected or the issue is source-only.

The repository's testing strategy is a verification contract, not a statement that all gates are currently green.
