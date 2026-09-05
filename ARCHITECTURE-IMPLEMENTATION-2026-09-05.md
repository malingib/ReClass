# ReClass Architecture Implementation — 2026-09-05

## Decision

Keep Svelte 5 + SvelteKit 2 + TypeScript + Tailwind + PostgreSQL/Supabase + Vercel as the core stack. Keep the application as a modular monolith. Do not introduce React/Next.js migration, Kubernetes, Redis/Kafka/RabbitMQ, or a separate backend until measured scale requires them.

## Enforced server boundaries

The server is organized around the module registry in `packages/shared/src/lib/modules.js`:

- `_auth` and `_platform` are kernel modules.
- `_sis` owns student information.
- `_finance` owns school finance and payroll/payment records.
- `_remedial` owns remedial operations.
- `_communications` owns shared communication workflows.
- `_dashboard` owns read-only cross-module reporting primitives.

Cross-module imports must use a module's public `index.ts`, `contracts.ts`, or `api.ts` surface. The CI pipeline now runs `npm run check:boundaries` on every push and pull request.

## Domain ownership

- Bursar / Finance: school finance, bank payments, reconciliation and receipts.
- ReClass / Remedial: remedial sessions, attendance and remedial operations.
- Payroll: teacher compensation workflow within Finance.
- Receipts: immutable evidence of actual payments.
- Notifications and audit: shared platform services.

A route or Svelte component must not become the source of truth for these rules. Server services and database constraints enforce them.

## Payments

Payment records remain the financial source of truth. External providers (M-Pesa, banks) provide evidence that is validated and reconciled before the internal state changes. Existing unmatched-payment handling uses tenant scoping and conditional claiming to prevent duplicate matching under concurrent requests.

For future provider expansion, preserve the conceptual pipeline:

`provider callback -> validate -> persist evidence -> idempotency -> reconcile -> receipt -> notification/audit`

## Background jobs and notifications

Continue using the existing PostgreSQL/pg_cron/pg_net/Edge Function model. Harden the queue with idempotency, bounded retries, leases and observable failure states before introducing a distributed queue.

Business modules enqueue notification intent; providers remain implementation details of the shared communication layer.

## Observability

Sentry remains the durable error/performance system. The in-process metrics collector is diagnostic only because Vercel instances are ephemeral. The collector was made concurrency-safe: request timings no longer share one mutable timer, and metric snapshots do not expose mutable internal arrays.

Business/audit events should remain persisted in the database. Do not treat process-local counters as financial, security, or SLA truth.

## Testing gates

CI currently performs:

1. dependency installation
2. dependency audit (high severity audit is reported without blocking existing deployments)
3. lint
4. server module-boundary verification
5. static tenant-isolation verification
6. TypeScript/Svelte typecheck
7. unit tests
8. production build
9. database migration replay and cross-tenant SQL isolation checks
10. push-triggered Playwright E2E when the live test secrets are configured

Critical workflows remain the release priority:

- Finance: payment -> reconciliation -> receipt -> notification
- Payroll: calculation -> approval -> payment -> audit
- Remedial: teacher -> session -> attendance -> approval/eligibility
- Security: tenant A cannot access tenant B

## Production rules

1. Never bypass tenant scoping in server queries.
2. Never expose service-role credentials to the browser.
3. Never make UI permissions the only authorization layer.
4. Never mutate historical payment evidence to repair a reconciliation; append a correction/audit event instead.
5. Keep receipts tied to actual payments.
6. Keep cross-domain reads on public module surfaces.
7. Prefer database constraints/RPC transactions for concurrency-sensitive financial operations.
8. Keep the modular monolith until telemetry demonstrates a real scaling boundary.
