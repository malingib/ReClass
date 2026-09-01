# eShule — Product Requirements & System Specification

> **Current-state specification — 1 September 2026.** This document records the product boundary, responsibilities, workflows and non-functional expectations for eShule. It supersedes the July planning-era ReClass SRS. Implementation evidence and production readiness are tracked separately.

## 1. Product boundary

eShule is a multi-tenant school-operations platform. **ReClass is the remedial learning and programme-management module within eShule.**

The platform covers school administration, teaching and learning, school finance, remedial programme operations, payroll and compensation, parent/guardian communication, receipts and payment evidence, governance, audit and reporting.

## 2. Responsibility and rights model

```text
User -> Base role -> Functional / committee assignment -> Responsibilities
     -> Rights / capabilities -> Navigation -> Dashboard / queues -> Allowed actions
```

The UI communicates responsibility but is never the security boundary. Server-side authorization and database controls independently enforce privileged operations.

| Area | Operational owner |
|---|---|
| School finance | Bursar |
| Remedial operations | ReClass |
| Teacher compensation | Payroll |
| Actual payment evidence | Receipts |
| Notifications | Shared service |
| Audit | Shared service |
| School-wide oversight | School administration / Principal according to assigned rights |

A Principal provides oversight and explicitly assigned approvals. A Bursar does not become a ReClass operator because they manage school finance. A teacher does not receive committee approval rights merely because they teach remedial classes.

## 3. Personas and responsibilities

### Super Admin
Platform-level tenant and configuration responsibility. Must not be used as an implicit school credential or payment fallback.

### School Admin
Manages school records, users, configuration and cross-domain operations according to granted rights.

### Principal
Provides school oversight, reviews operational performance and performs explicitly assigned approvals. The Principal does not replace the Bursar or remedial committee owners.

### Bursar
Owns school finance: fee definitions, receivables, reconciliation, waivers and financial reporting within granted rights.

### Teacher
Delivers classroom/remedial teaching and records assigned attendance or delivery evidence. Teacher type may be `classroom`, `remedial`, or `both`.

### Remedial committee
Committee assignments are governance hats, not replacements for teacher type. Current hats include `chairman`, `treasurer`, `member` and `none`.

- Teacher: delivers sessions and records attendance.
- Committee member/chairman with the appropriate right: reviews or approves attendance.
- Treasurer: prepares/runs remedial payroll and initiates payout.
- Chairman: approves payroll or authorizes payout where required.

### Parent / Guardian
Sees only linked students and may view attendance, schedules, balances, receipts and communications available to the account.

## 4. Core workflows

### Teaching and attendance
1. Administrator configures classes, subjects, teachers and schedules.
2. Teacher sees assigned teaching work.
3. Teacher records the permitted attendance/delivery event.
4. The designated reviewer approves or rejects it where governance approval is required.
5. Approved delivery data can feed eligible payroll calculations.

### ReClass
1. School defines the remedial programme structure and sessions.
2. ReClass manages remedial schedules, delivery records, programme attendance and committee workflow.
3. ReClass may create or serve remedial fee obligations but does not own school-wide finance.
4. Remedial compensation flows through Payroll.

### School finance and payments
1. Bursar manages fee obligations and receivables.
2. Parent/guardian initiates an allowed payment flow.
3. Provider callback or controlled reconciliation records the actual payment.
4. A receipt represents evidence of successful payment.
5. Reconciliation is tenant-scoped and idempotent.

### Payroll
1. Eligible compensation components are defined.
2. A payroll run is generated for the appropriate domain.
3. Components may include base salary, allowances, remedial, committee, role-specific and adjustments.
4. Required approvals follow responsibility separation.
5. Payout is initiated only by the authorized operator.
6. Payment evidence remains distinct from the payroll definition/run.

### Communication
Notifications are shared infrastructure. Events may produce in-app, SMS or other configured messages. Delivery, retry, failure and audit states must be observable.

## 5. Security and tenancy requirements

- Every authenticated request has a verified identity and tenant context where applicable.
- Tenant ownership must be checked on primary records and referenced records in privileged operations.
- Service-role database access bypasses RLS and therefore requires explicit tenant predicates and ownership checks.
- Prefer user-scoped/RLS access for ordinary operations and narrowly scoped privileged RPCs for exceptional operations.
- Capability checks must be performed server-side.
- Sensitive provider credentials must never be returned to clients or treated as tenant fallbacks.
- Payment reconciliation must be idempotent and resistant to replay, duplicate callbacks and tenant confusion.
- Financial history must not be silently overwritten or duplicated.
- Audit records must identify actor, tenant, action, affected resource and outcome for privileged mutations.

## 6. Data model principles

```text
Student / Guardian
        |
        v
Invoice / obligation
        |
        v
Payment transaction
        |
        v
Receipt / payment evidence

Teacher / role
        |
        v
Payroll component
        |
        v
Payroll run
        |
        v
Payout / payment evidence
```

Do not use receipts as invoices, invoices as payment evidence, or payroll runs as proof that money was actually paid.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Server-enforced authorization, tenant isolation, secure secrets and auditable privileged actions |
| Accessibility | Target WCAG 2.1 AA on critical journeys |
| Localization | English primary; Swahili support where implemented; EAT timezone and KES currency |
| Reliability | Idempotent external callbacks and retry-safe background work |
| Performance | Bounded queries, pagination and SQL-side aggregation for high-cardinality data |
| Availability | Measured against the supported production deployment and its operational evidence |
| Recoverability | Tested backup/restore and rollback procedures before broad production rollout |

## 8. Implementation principles

1. Prefer the current SvelteKit + Supabase architecture documented in `ARCHITECTURE.md`.
2. Do not duplicate business rules in pages when a shared server/domain function exists.
3. Keep domain ownership explicit in route names, services, capabilities and UI labels.
4. Use database constraints and transactions for invariants that must hold under concurrency.
5. Add tests and documentation whenever a business invariant changes.
6. Do not reintroduce planning-era architecture, stack or deployment assumptions without an explicit decision record.

## 9. Documentation status

This is a current-state product/system specification. Historical planning material may remain in Git history, but it must not be interpreted as proof that every planned feature is implemented or deployed.

See `README.md`, `ARCHITECTURE.md`, `API.md`, `SECURITY.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `ROADMAP.md` and `CHANGELOG.md` for the corresponding implementation and operational references.
