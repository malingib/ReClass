# eShule Security

> **Current-state security reference — 1 September 2026.** This document describes the security model, invariants and known release concerns for the repository. It is not a penetration-test certificate and does not prove hosted configuration.

## 1. Security priorities

Security decisions are ordered by impact:

1. tenant isolation;
2. authorization and separation of duties;
3. financial integrity;
4. credential and secret protection;
5. protection of student/parent/staff data;
6. availability and recovery;
7. observability and auditability.

## 2. Trust model

```text
Browser
  -> SvelteKit authentication/session
  -> server authorization + tenant context
  -> domain operation
  -> Supabase/Postgres / Edge Function
  -> external provider
```

The browser is untrusted. UI visibility is a usability mechanism, not an authorization control.

## 3. Tenant isolation

Every tenant-owned operation must be scoped to the authenticated tenant. Referenced records must also be proven to belong to that tenant.

Service-role access bypasses PostgreSQL RLS and therefore requires explicit server-side tenant and ownership checks. Ordinary user-scoped/RLS access is preferred; privileged service-role or security-definer operations should be narrow and auditable.

Cross-tenant negative tests are required for high-risk relationships including students, guardians, teachers, sessions, attendance, invoices, payments, receipts, payroll, notifications, audit records and credentials.

## 4. Authorization and separation of duties

The effective model is:

```text
User -> Base role -> Functional / committee assignment
     -> Responsibility -> Capability -> Action
```

Key invariants:

- Bursar owns school finance.
- ReClass owns remedial programme operations.
- Payroll owns teacher compensation.
- Receipts document actual payments.
- Notifications and audit are shared services.
- Principal oversight does not automatically confer Bursar, Payroll or ReClass operator rights.
- Teacher type (`classroom`, `remedial`, `both`) is distinct from remedial committee assignment.
- Teaching access does not automatically grant governance approval rights.
- Committee payroll preparation and payout approval remain separated according to assigned rights.

## 5. Secrets and credentials

- Provider credentials are tenant-scoped by purpose.
- `school_send` credentials belong to the school operation.
- `platform_billing` credentials belong to platform operations and are never a tenant fallback.
- Secrets must be encrypted at rest and never returned to browser clients.
- Secrets must not appear in logs, test fixtures, screenshots, issues or error responses.
- Suspected exposure requires revocation/rotation, not merely deletion of a Git commit.

## 6. Financial security

Payment flows must be:

- tenant-bound;
- idempotent;
- resistant to duplicate/replayed provider callbacks;
- protected against conflicting transaction identifiers;
- safe under concurrency;
- backed by immutable or appropriately protected payment evidence;
- auditable.

Invoices represent obligations. Payments represent transactions. Receipts represent evidence of actual payment. Payroll runs represent compensation processing, not proof of successful payout.

## 7. External callbacks and integrations

Provider callbacks are untrusted until authenticated and validated. Callback processing must:

- accept only the required HTTP method;
- validate request size and required fields;
- fail closed when required authentication/configuration is absent;
- bind provider identifiers to stored transaction state;
- use authoritative stored amounts/tenant context;
- be idempotent;
- record safe replay identifiers for investigation.

External calls require bounded timeouts and controlled retry behavior.

## 8. Application security

- Validate untrusted form, JSON, CSV and URL input server-side.
- Use allowlists for import fields and privileged actions.
- Avoid raw SQL concatenation with untrusted values.
- Keep server-only modules and secrets out of client bundles.
- Use secure, appropriately scoped cookies for authentication/session state.
- Maintain security headers and strict content handling.
- Avoid returning internal database/provider error messages to users.

## 9. Audit

Privileged mutations should produce audit evidence containing, as appropriate, actor, tenant, action, resource, time, result and approval/context metadata.

Audit logs are a shared service and must not be treated as the responsibility of a single business domain.

## 10. Operational security

Production must have:

- protected secrets and environment separation;
- least-privilege provider/database access;
- backup/PITR verification;
- restore exercises;
- dependency/security scanning;
- monitoring and alerting;
- incident ownership and escalation;
- rollback/roll-forward procedures.

Do not claim these controls are operational merely because repository configuration exists.

## 11. Current release concerns

The repository remains a release candidate rather than a blanket production-readiness certification. The release gate is evidence-based and includes database migration replay, tenant isolation, critical financial workflows, provider integration, CI/build, accessibility, observability and recovery verification.

See `ROADMAP.md` for prioritized release work and `docs/testing.md` for executable verification expectations.

## 12. Security reporting

Do not publish exploitable tenant-isolation issues, credentials, personal data or payment vulnerabilities in public issues. Report them privately with a minimal reproduction using synthetic non-production data. Never access another tenant's data or production systems without explicit authorization.
