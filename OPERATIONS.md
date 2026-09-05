# eShule Operations

> **Current-state operations reference — 1 September 2026.** These procedures describe the supported operational model. A procedure existing here does not prove that the corresponding hosted service, alert or backup is active.

## 1. Operational ownership

| Area | Owner |
|---|---|
| School operations | School administration |
| School finance | Bursar |
| Remedial programme operations | ReClass |
| Teacher compensation | Payroll |
| Payment evidence | Receipts |
| Notifications | Shared service |
| Audit | Shared service |
| Platform infrastructure | Platform/SRE ownership |

Operational incidents should be routed to the owner of the affected domain while preserving cross-domain incident coordination.

## 2. Daily checks

Verify:

- web deployment is serving the intended commit;
- authentication and role routing work;
- database and migration state matches the release;
- notification queue has no unexplained backlog;
- payment reconciliation has no unexplained failures or duplicate identities;
- scheduled jobs have recent successful executions;
- provider credentials required by active tenants remain valid;
- error monitoring has no unresolved critical spike.

Never paste credentials or sensitive student/payment records into an operational ticket.

## 3. Payment operations

When a payment appears missing:

1. identify the tenant and intended obligation;
2. locate the pending payment/check-out identity;
3. compare provider status with the stored transaction;
4. verify tenant and amount binding;
5. reconcile through the supported idempotent operation;
6. verify payment and receipt evidence;
7. confirm the invoice balance changed exactly once;
8. record the investigation in audit evidence.

Do not manually change invoice balances to make a dashboard appear correct. Repair the underlying transaction through a reviewed operation.

## 4. Payroll operations

Payroll incidents must preserve separation of duties.

- Verify the payroll domain (`school` or `remedial`).
- Verify the teacher, period and tenant.
- Verify compensation components and approvals.
- Confirm the payout response before marking a payout as successful.
- Do not use a payroll run as evidence that money reached a teacher.
- Keep actual payment evidence separate.

## 5. Notification operations

For failed or delayed notifications:

1. inspect event and delivery identifiers;
2. verify tenant and recipient scope;
3. check retry schedule and attempt count;
4. inspect provider availability/status;
5. retry only through the queue/idempotent mechanism;
6. move permanently failed work to the defined dead-letter path when implemented;
7. confirm that sensitive payloads are redacted from logs.

Avoid manual provider sends when they could create duplicate school messages.

## 6. Database and migration operations

Migrations are forward-only and repository-controlled.

Before a high-risk migration:

- verify backup/PITR availability;
- review the migration and affected constraints/functions/policies;
- test against a clean database;
- test an upgrade from a production-like snapshot;
- capture schema/type diffs;
- define rollback or roll-forward procedure.

Do not run `supabase db reset` against a hosted production project. Do not treat SQL Editor changes as the authoritative migration path.

## 7. Tenant isolation incident

If cross-tenant exposure is suspected:

1. stop the affected operation or deployment;
2. preserve safe logs and commit identifiers;
3. identify the exact route/function/query and affected tenant scope;
4. revoke/rotate exposed credentials if relevant;
5. prevent further access through the affected path;
6. determine whether data was read, changed or only potentially exposed;
7. restore/repair data through controlled procedures;
8. document the incident and regression test;
9. perform required notification/compliance assessment privately.

Never investigate by browsing another tenant's live data without explicit authorization.

## 8. Provider outage

If M-Pesa or SMS is unavailable:

- do not report successful payment/message delivery until confirmed;
- preserve pending/idempotent transaction state;
- allow supported retry/reconciliation mechanisms to recover;
- monitor queue growth and provider error rates;
- communicate operational impact without exposing internal credentials or provider payloads.

## 9. Deployment and rollback

The supported architecture is SvelteKit/Vercel plus managed Supabase as documented in `ARCHITECTURE.md` and `DEPLOYMENT.md`.

A rollback decision should consider both application code and database compatibility. Prefer roll-forward for irreversible schema changes; use expand-and-contract migrations and compatibility windows to make rollback safe.

Record:

- release commit;
- deployment identifier;
- migration versions;
- observed failure;
- decision owner;
- recovery action;
- post-recovery verification.

## 10. Observability minimum

Production should monitor at least:

- web error rate and latency;
- authentication failures;
- database errors/latency;
- notification queue depth/age/retries;
- payment pending/failed/reconciled counts;
- provider error rates;
- scheduled job success/lag;
- backup/PITR status;
- critical authorization failures.

Use redacted structured logs with correlation/request identifiers.

## 11. Backup and recovery

A production deployment is not considered recoverable until restoration has been demonstrated.

Maintain documented RPO/RTO targets, backup retention, restore ownership and a recurring restore exercise. Never store backup exports containing school data in the source repository.

## 12. Change management

Every production change should identify:

- purpose and affected domain;
- tenant/data/security impact;
- migration requirements;
- tests/evidence;
- deployment owner;
- rollback/roll-forward strategy;
- monitoring plan.

Repository configuration is not proof of hosted configuration. Validate the actual environment before declaring an operational control active.
