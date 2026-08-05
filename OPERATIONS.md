# ReClass Operations

> Current-state note (2026-08-01): [AUDIT-2026-08.md](AUDIT-2026-08.md) records current validation and gaps. Runbooks below are proposed/operational guidance and are not evidence that hosted alerts, backups, or SLOs are active.

**Implementation audit date:** 2026-07-22  
**Operational readiness:** **NOT PRODUCTION-READY. Deployment is blocked.**

This runbook separates current implementation from required operating controls. Source evidence does not prove hosted configuration, backups, alerts, or prior drills. Deployment blocking details are in `DEPLOYMENT.md`; database replay and recovery gaps are in `DATABASE.md`.

## 1. Service Inventory and Ownership

| Service | Responsibility | Evidence | Required owner |
|---|---|---|---|
| SvelteKit web | SSR, auth/session resolution, role UI, domain actions | `src/routes/`, `src/hooks.server.ts` | application on-call |
| Supabase Auth/PostgREST/PostgreSQL | identity and durable application/financial state | `src/lib/supabase/`, `supabase/migrations/` | database/platform on-call |
| `stk` Edge Function | authenticated M-Pesa STK initiation | `supabase/functions/stk/index.ts` | payments on-call |
| `mpesa-callback` Edge Function | provider callback and reconciliation | `supabase/functions/mpesa-callback/index.ts` | payments on-call |
| `notify` Edge Function | SMS queue drain and retries | `supabase/functions/notify/index.ts` | messaging on-call |
| `payment-reminders` Edge Function | overdue-invoice reminder enqueue | `supabase/functions/payment-reminders/index.ts` | billing/messaging on-call |
| `credentials-test` Edge Function | Daraja/Mobiwave credential validation | `supabase/functions/credentials-test/index.ts` | platform on-call |
| Database jobs | queue drain, reminders, occurrence generation, cleanup, keep-warm | cron migrations listed below | database/platform on-call |

Before launch, assign named primary/secondary responders and escalation contacts for Vercel, Supabase, Safaricom/Daraja, Mobiwave, DNS, and Sentry.

## 2. Health, Liveness, and Readiness

### Current endpoint

`GET /api/healthz` is implemented to return `status`, Node process uptime, whether the request has an authenticated Supabase user, and timestamp (`src/routes/api/healthz/+server.ts`). Every request also attempts `supabase.auth.getUser()` before responding. However, the route is not public: global route guarding redirects unauthenticated requests and may redirect authenticated role users because `/api` is not their role prefix (`src/lib/config.ts:20-22`, `src/lib/server/middleware.ts:120-135`). It is therefore not a usable external probe in the current implementation.

Limitations:

- External monitoring cannot reliably reach its JSON response until route-guard behavior is changed.
- It is not a pure liveness probe because request middleware and `getUser()` involve Supabase Auth (`src/hooks.server.ts:10-17`, `src/lib/server/middleware.ts:38-47`).
- It does not query PostgreSQL/PostgREST, validate migrations, check Vault, inspect cron, measure queue lag, or test M-Pesa/Mobiwave.
- It always reports `status: ok` if execution reaches the handler, even if core database operations are unavailable.

### Required endpoints

Implement separate unauthenticated, non-sensitive endpoints before production:

| Probe | Semantics | Success | Must not do |
|---|---|---|---|
| `/api/live` | process/event-loop alive | fast HTTP 200 | no network/dependency call |
| `/api/ready` | instance may receive user traffic | bounded successful Auth/PostgREST/database check and expected migration marker | call payment/SMS providers or mutate data |
| `/api/healthz` | human/monitor summary | component status with redacted details | expose keys, SQL errors, tenant data, or provider responses |

Use strict dependency timeouts. Remove an instance from traffic on readiness failure, but do not restart it solely because Daraja or Mobiwave is down. External provider failure should degrade only payment initiation or SMS delivery.

## 3. Observability Status and Target

### Implemented

- Server/client Sentry error handlers: `src/hooks.server.ts:19`, `src/hooks.client.ts`.
- Sentry tracing sample rate `0.1`: `sentry.server.config.ts`, `sentry.client.config.ts`.
- Browser replay samples 10% of sessions and all error sessions when enabled: `sentry.client.config.ts:7-8`.
- A generated request ID is placed in `event.locals.requestId` and response `X-Request-Id`: `src/lib/server/middleware.ts:85-90`.
- `logError()` emits one JSON error shape: `src/lib/server/log.ts`.

### Gaps

- No centralized log drain, retention, dashboards, metrics exporter, tracing propagation, alert rules, uptime monitor, or status page is defined.
- Request IDs are not accepted from a trusted proxy, attached automatically to logs/Sentry, passed to Supabase/Edge Functions, or returned by Edge Functions.
- Most logs/errors are plain or swallowed; Edge catch blocks commonly return `INTERNAL_ERROR` without logging (`supabase/functions/*/index.ts`).
- No release/environment tags are configured in Sentry.
- Browser replay has no repository-defined PII/payment-field scrubbing policy.

### Required telemetry

Create environment-tagged dashboards for:

- web request rate, p50/p95/p99 latency, HTTP 4xx/5xx, cold starts, CPU/memory/concurrency;
- Supabase API latency/error rate, DB connections, CPU, memory, disk, IOPS, locks, dead tuples, replication/PITR status;
- Auth success/failure/latency without logging passwords or tokens;
- STK requests by outcome, callback latency, pending checkout age, reconciliation errors, payment ledger drift;
- notification queue depth/oldest age, sent/failed/retry counts, attempts exhausted, Mobiwave latency/error codes;
- cron last success/duration/failures and future session horizon;
- Sentry issue/regression rate by release/environment.

## 4. Structured Logging and Correlation

Every web and Edge log event should be one JSON object with:

```json
{
  "timestamp": "2026-07-22T00:00:00.000Z",
  "level": "info",
  "service": "web|stk|mpesa-callback|notify|payment-reminders",
  "environment": "staging|production",
  "release": "<git-sha>",
  "request_id": "<uuid>",
  "event": "<stable-event-name>",
  "tenant_id": "<uuid-if-authorized>",
  "duration_ms": 0,
  "outcome": "success|failure"
}
```

Rules:

- Accept a platform trace/request ID only from trusted ingress; otherwise generate one.
- Return `X-Request-Id`, attach it to Sentry, and propagate it to internal calls and provider metadata where supported.
- Use stable event names such as `payment.stk.requested`, `payment.callback.reconciled`, `sms.delivery.failed`, and `cron.run.completed`.
- Never log authorization headers, cookies, service-role/anon keys, callback secret, Vault plaintext, Daraja consumer secret/passkey/access token, Mobiwave API token, full phone number, payment body, or student/guardian PII.
- Log provider IDs such as `CheckoutRequestID` only where access/retention is approved; use redacted phone suffixes.
- Preserve immutable audit evidence separately from diagnostic logs. `audit_log` is selective, not a complete mutation trail (`ARCHITECTURE.md:256`).

## 5. Proposed SLOs, SLIs, and Alerts

No SLO is currently approved or measured. The following are launch targets requiring product/operations approval, instrumentation, and a 30-day rolling window.

| Service objective | SLI | Proposed target | Error budget |
|---|---|---:|---:|
| Authenticated web availability | good non-probe requests / valid requests, excluding client 4xx | 99.9% | 43.2 min/month equivalent |
| Web latency | valid SSR requests under 2 s at p95 | 99% | 1% slow requests |
| STK acceptance path | eligible authenticated STK attempts reaching a definitive provider response within 10 s | 99.5% | 0.5% |
| Successful callback reconciliation | valid successful callbacks reconciled or deduplicated within 60 s | 99.9% | 0.1% |
| SMS queue timeliness | deliverable queued SMS reaches sent/terminal failure within 10 min | 99% | 1% |
| Scheduled-job freshness | each critical job completes within 2 expected intervals | 99.9% | 0.1% |

Do not count provider-declared customer cancellations as system failures, but count internal errors, unprocessed valid callbacks, and stuck work. Track provider availability separately so internal and dependency impact are visible.

### Alert policy

| Severity | Trigger | Response |
|---|---|---|
| SEV-1 page | payment reconciliation stopped; cross-tenant exposure; confirmed financial corruption; production unavailable; restore required | immediate incident command |
| SEV-2 page | web fast-burn; callbacks/pending checkout age breach; SMS queue oldest age >10 min and growing; critical cron misses two intervals | acknowledge within 15 min |
| SEV-3 ticket | slow-burn SLO consumption; failed SMS increase without queue growth; capacity forecast threshold | business-hours investigation |

Use multi-window error-budget burn alerts rather than paging on isolated failures. Freeze non-critical releases when the 30-day availability error budget is exhausted. Every page must link to this runbook and a dashboard.

## 6. Routine Verification Commands

Set scoped environment variables without recording secrets in shared shell history:

```bash
export BASE_URL='https://app.reclass.co.ke'
export DATABASE_URL='<postgres-connection-uri>'
# Use only after the required public, non-sensitive liveness endpoint is implemented.
curl --fail-with-body --silent --show-error "$BASE_URL/api/live"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select now(), version();"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select jobid, jobname, schedule, active from cron.job order by jobname;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select jobid, status, start_time, end_time, return_message from cron.job_run_details order by start_time desc limit 30;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select status, count(*) from notifications group by status order by status;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select min(created_at) as oldest_queued, count(*) as queued from notifications where status='queued';"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select status, count(*), min(created_at) as oldest from checkout_requests group by status order by status;"
```

Expected scheduled jobs are defined in:

- `reclass-sms-notify`, every two minutes: `supabase/migrations/20260714000001_cron_schedules.sql:22-36`.
- `reclass-payment-reminders`, daily at server time 08:00: `supabase/migrations/20260714000001_cron_schedules.sql:38-52`.
- `reclass-session-occurrences`, daily at 00:15: `supabase/migrations/20260719000003_whole_class_delivery.sql:103-110`.
- `reclass-cleanup-notifications`, Sunday at 03:00: `supabase/migrations/20260722000003_phase6_db_fixes.sql:132-139`.
- three five-minute keep-warm jobs: `supabase/migrations/20260722000004_edge_function_keepwarm.sql`.

Cron expressions use database server time unless explicitly configured. Confirm the hosted timezone and document business-time conversion.

The keep-warm jobs issue unauthenticated `GET` requests to POST/body-oriented functions. `stk` and `credentials-test` attempt to authenticate/parse request bodies, while `mpesa-callback` attempts to parse a callback body (`supabase/functions/stk/index.ts`, `credentials-test/index.ts`, `mpesa-callback/index.ts`). These calls can produce gateway or function errors and are not valid health checks. Disable/remove them unless a dedicated harmless warm/health path and expected status are implemented; never alert on them as user availability.

## 7. Payment Runbook

### Signals

- spike in STK 5xx/4xx or latency;
- pending `checkout_requests` older than the normal callback window;
- callback 401/404/409/500 responses;
- payments received at Safaricom but absent from `payments`;
- invoice cached balance drift;
- callback secret missing or callback URL mismatch.

### Triage

1. Declare SEV-1 if successful customer payments may be lost, duplicated, misallocated, or cross-tenant.
2. Pause new STK initiation at ingress/feature flag if callbacks or reconciliation are unsafe. There is no repository-defined feature flag, so establish an approved operational control before launch.
3. Check Edge logs for `stk` and `mpesa-callback`, Vercel/Supabase status, Daraja status, and credential test state.
4. Verify callback URL construction from the overloaded `PUBLIC_URL` (`supabase/functions/stk/index.ts:65-68`, `_shared/cors.ts:1-7`) and confirm `MPESA_CALLBACK_SECRET` enforcement (`mpesa-callback/index.ts:5-14`). The webhook must bypass Supabase gateway JWT verification because Safaricom does not hold a user JWT, so the callback's own authentication is mandatory.
5. Compare checkout state with provider records. Never mark a payment successful based only on a customer screenshot.
6. Replay a captured callback only after validating authenticity, amount, tenant, invoice, and checkout ID. `reconcile_payment` is intended to deduplicate by checkout ID and lock the invoice (`supabase/migrations/20260722000001_fix_rpc_bugs.sql`), but use staging evidence before relying on it.
7. Reconcile invoice balances and queue any missing receipt only after the ledger is correct.

### Diagnostic SQL

```sql
-- Pending checkouts requiring provider comparison; tune the interval to the approved SLA.
SELECT id, tenant_id, invoice_id, checkout_id, amount, status, created_at
FROM checkout_requests
WHERE status = 'pending' AND created_at < now() - interval '10 minutes'
ORDER BY created_at;

-- Completed checkouts lacking a payment with the same provider checkout ID.
SELECT cr.id, cr.tenant_id, cr.invoice_id, cr.checkout_id, cr.amount
FROM checkout_requests cr
LEFT JOIN payments p
  ON p.tenant_id = cr.tenant_id AND p.mpesa_checkout_id = cr.checkout_id
WHERE cr.status = 'completed' AND p.id IS NULL;

-- Cached paid amount compared with paid ledger.
SELECT i.id, i.tenant_id, i.amount_paid,
       coalesce(sum(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS paid_ledger
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id AND p.tenant_id = i.tenant_id
GROUP BY i.id, i.tenant_id, i.amount_paid
HAVING i.amount_paid <> coalesce(sum(p.amount) FILTER (WHERE p.status = 'paid'), 0);
```

### Known payment risks

- Concurrent STK requests can pass the separate pending check and insert because no unique active-checkout constraint exists (`stk/index.ts:37-42,69-75`).
- STK provider acceptance and local checkout ID update are separate operations (`stk/index.ts:77-97`).
- Checkout completion is updated after reconciliation in another call (`mpesa-callback/index.ts:34-44`).
- Callback authentication is optional when its secret is absent.

Do not delete or directly rewrite payment ledger rows during incident response. Record every correction in an approved reconciliation/audit workflow.

## 8. SMS Runbook

### Signals

- queued oldest age exceeds 10 minutes;
- failed/attempt-exhausted count rises;
- Mobiwave errors, balance exhaustion, invalid sender ID, or credential decryption failures;
- duplicate SMS reports;
- reminders absent despite overdue invoices.

### Triage and recovery

1. Check `reclass-sms-notify` cron history, Vault URL/service-role secret names, Edge logs, Mobiwave status/balance, and tenant credential test status.
2. Verify the tenant SMS toggle before manually enqueueing (`mpesa-callback/index.ts:46-55`, `payment-reminders/index.ts:43-54`).
3. Stop overlapping workers before replaying work if duplicates are occurring.
4. Correct credentials/sender ID, then retry only confirmed unsent rows in a bounded tenant-specific batch.
5. Do not reset all failed rows globally. Provider acceptance may have occurred before a local status update.
6. Compare provider message IDs/delivery reports where available before retry.

```sql
SELECT tenant_id, status, attempts, count(*)
FROM notifications
WHERE channel = 'sms'
GROUP BY tenant_id, status, attempts
ORDER BY tenant_id, status, attempts;

SELECT id, tenant_id, recipient, attempts, next_retry_at, last_error, created_at
FROM notifications
WHERE channel = 'sms' AND status IN ('queued', 'failed')
ORDER BY created_at
LIMIT 200;
```

Known risks: `notify` selects without an atomic claim/lease, so overlapping runs can send duplicates; it writes `next_retry_at` but does not filter on it (`supabase/functions/notify/index.ts:21-23,66-72`). It processes sequentially with a default limit of 100. Reminder timestamp update and queue insert are not transactional (`payment-reminders/index.ts:70-88`), so a failed insert can suppress another reminder for three days.

## 9. Queue and Cron Operations

`notifications` is a PostgreSQL work table, not a durable broker. There is no DLQ, atomic lease, heartbeat, or replay tool.

### Safe operational actions

- Inspect job configuration and run history before invoking a job manually.
- Invoke workers with the service-role bearer token only from an approved secret-aware runner.
- Bound manual notification runs with a small `limit` and observe results.
- Avoid concurrent manual and scheduled runs because rows are not claimed atomically.
- Never expose the service-role key in tickets, logs, command output, or shell history.

```bash
curl --fail-with-body --silent --show-error \
  -X POST 'https://<project-ref>.supabase.co/functions/v1/notify' \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"limit":10}'
```

Use a protected runner for the command above. A successful HTTP response is not sufficient; confirm row status, provider delivery evidence, oldest queue age, and duplicate count.

### Session occurrence horizon

```sql
SELECT min(occurs_on) AS first_date, max(occurs_on) AS last_date, count(*)
FROM session_occurrences
WHERE occurs_on >= current_date;
```

The generator targets 56 days ahead (`supabase/migrations/20260719000003_whole_class_delivery.sql:88-108`). Alert if the horizon falls below seven days.

### Notification cleanup

The weekly job permanently deletes sent/failed notifications older than 90 days (`supabase/migrations/20260722000003_phase6_db_fixes.sql:109-139`). Despite the migration heading, it does not archive them. Confirm legal, financial, support, and audit retention before enabling this job in production.

## 10. Backup, PITR, and Restore Drill

### Current status

No repository-defined backup policy, retention setting, PITR evidence, immutable off-platform copy, restore automation, or completed drill exists (`DATABASE.md:256-277`). Therefore current RPO and RTO are **unverified**.

### Required policy

| Control | Initial target, pending approval |
|---|---|
| Billing/payment RPO | <=5 minutes using continuous WAL/PITR |
| Full-service RTO | <=4 hours |
| Managed backup | daily snapshot plus PITR with documented retention |
| Off-platform backup | encrypted logical/physical-compatible export to a separate account/region with retention lock |
| Restore test | monthly automated restore/integrity check; quarterly timed application DR exercise |

Managed Supabase backup alone is not an off-platform backup. Vault/provider secret recovery, Auth users, Storage objects if adopted, Edge Function source/secrets, cron jobs, and DNS/Vercel configuration require separate recovery coverage.

### Off-platform logical backup

Run from an approved encrypted runner and use Supabase-supported connection parameters/options for the hosted version:

```bash
umask 077
export SNAPSHOT="reclass-$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$SNAPSHOT.dump"
pg_restore --list "$SNAPSHOT.dump" > "$SNAPSHOT.list"
sha256sum "$SNAPSHOT.dump" "$SNAPSHOT.list" > "$SNAPSHOT.sha256"
sha256sum --check "$SNAPSHOT.sha256"
```

Encrypt and upload through the approved backup tool; do not retain plaintext dumps on runner disks. A logical dump does not necessarily include managed Auth/Vault internals or platform configuration. Verify exact scope with Supabase and supplement it.

### Restore drill

Restore only into an isolated non-production Supabase/PostgreSQL project with outbound M-Pesa/SMS disabled.

```bash
createdb "$RESTORE_DATABASE_NAME"
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$SNAPSHOT.dump"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) from tenants;"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select status, count(*) from payments group by status;"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select jobname, schedule, active from cron.job order by jobname;"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select tablename, policyname from pg_policies where schemaname='public' order by 1,2;"
```

For managed Supabase, project creation and Auth/Vault restore may require platform-specific steps rather than `createdb`; document the tested commands/API for the selected plan. The drill must verify:

- schema/migration ledger, constraints, functions, triggers, grants, RLS, extensions, and cron jobs;
- Auth user to profile/role linkage without emailing real users;
- tenant isolation negative tests;
- invoice/payment/waiver ledger counts and drift query returns zero;
- credentials can be restored/rotated without exposing plaintext;
- web can connect to restored Auth/PostgREST with synthetic users;
- outbound callbacks/SMS remain blocked until cutover approval;
- elapsed recovery time and measured data-loss window meet RTO/RPO.

Delete the drill environment and plaintext artifacts under the approved retention process. Record evidence, gaps, owner, and due dates.

## 11. Incident Response

### Severity and roles

| Role | Responsibility |
|---|---|
| Incident commander | severity, coordination, decisions, handoffs |
| Operations lead | mitigation, rollback, platform/provider actions |
| Application/database lead | diagnosis, data integrity, recovery validation |
| Communications lead | internal/customer/provider updates |
| Scribe | UTC timeline, commands, evidence, decisions |

### Response sequence

1. Acknowledge, assign incident ID/severity, open a restricted incident channel, and start a UTC timeline.
2. Protect people/data/money first: disable unsafe writes or integration traffic while preserving evidence.
3. Determine blast radius by environment, tenant, role, time, and transaction IDs. Assume service-role mistakes can cross tenants.
4. Mitigate with traffic rollback, feature isolation, credential rotation, bounded queue pause, or provider escalation.
5. Verify with user-facing checks and financial/queue/database invariants, not only green infrastructure.
6. Communicate on a fixed cadence and meet breach/provider notification obligations.
7. Recover, monitor through a defined stability window, and obtain incident commander closure.
8. Complete a blameless postmortem within five business days for SEV-1/SEV-2, with owned actions and dates.

Preserve Sentry events, deployment IDs, Git SHA, Supabase logs, cron history, provider request IDs, database query results, and audit records. Do not paste secrets or full PII into incident channels.

### Disaster decision

Use PITR only when forward repair cannot safely restore integrity. Before rewind, stop writes/callback ingestion, capture current state, choose a recovery timestamp, assess all externally accepted payments/SMS after that point, and plan replay/reconciliation. A database rewind without external reconciliation can lose accepted M-Pesa events.

## 12. DR Status

| Capability | Audit status |
|---|---|
| Approved RTO/RPO | absent; proposed 4 h / 5 min only |
| PITR enabled and retention verified | no repository evidence |
| Cross-region/project recovery | not implemented/evidenced |
| Off-platform immutable backup | not implemented/evidenced |
| Auth/Vault/Edge secret recovery | not documented/tested |
| DNS/web failover | not codified/tested |
| Payment callback buffering/replay | not implemented/evidenced |
| Completed restore/DR exercise | no evidence |

Until a timed restore and application-level recovery drill succeeds, report RTO/RPO as **unknown/unverified**, not as achieved targets.

## 13. Capacity Planning

### Current scaling constraints

- Web rate limiting is in-process and not shared across replicas (`src/lib/server/rate-limit.ts`, `ARCHITECTURE.md:348`).
- Notification processing is sequential, limited to 100, and unsafe under overlapping workers (`notify/index.ts`).
- Many queries rely on the Supabase `max_rows = 1000` ceiling rather than complete pagination (`supabase/config.toml:16-18`, `DATABASE.md:244-254`).
- No connection-pool, load-test, query-plan, resource, table-growth, or provider-rate baseline is versioned.

### Monthly review

Track by environment and high-volume tenant:

- active users, request rate and peak concurrency;
- DB CPU/memory/connections/IOPS/storage, cache hit ratio, lock waits, slow queries, dead tuples;
- row/index growth for `notifications`, `audit_log`, `messages`, `checkout_requests`, `payments`, and `session_occurrences`;
- queue arrival/service rate, oldest age, retry/failure rate, projected catch-up time;
- STK/callback rate and provider limits;
- SMS throughput, balance, sender limits, cost, and provider throttling;
- Vercel function duration/concurrency/cold starts and Supabase quotas.

Forecast at least 90 days. Open capacity work at 60% sustained of a hard quota, page/escalate at 80%, and retain 2x measured peak headroom for critical synchronous services until load tests justify another factor. Thresholds must be adjusted to actual provider/platform limits.

Before major enrollment, billing, or reminder events, run production-like staging load tests with synthetic data and external providers stubbed. Validate database plans with `EXPLAIN (ANALYZE, BUFFERS)` on a restored/sanitized volume; never run destructive load tests in production.

## 14. On-Call Checklists

### Start of shift

- [ ] Confirm primary/secondary contacts and provider escalation access.
- [ ] Review open incidents, risky changes, maintenance, and error-budget status.
- [ ] Check web health, Sentry regressions, Supabase status, and recent deployments.
- [ ] Check pending checkout oldest age and payment drift alert.
- [ ] Check SMS queue oldest age/failures and Mobiwave balance.
- [ ] Check critical cron jobs completed within two expected intervals.
- [ ] Check DB saturation, storage growth, connection pressure, locks, and backup/PITR status.

### Before deployment

- [ ] Confirm `DEPLOYMENT.md` blockers are cleared and CI evidence belongs to the exact SHA.
- [ ] Confirm staging smoke/payment/SMS/tenant-isolation tests and soak passed.
- [ ] Confirm approved recovery point, rollback artifact, incident owner, and change window.
- [ ] Confirm migrations are additive/backward compatible and dry-run reviewed.
- [ ] Confirm dashboards, alerts, provider status, and support contacts are available.

### After deployment

- [ ] Verify `/api/healthz`, login, representative role page, and security/request-ID headers.
- [ ] Verify migration ledger, Edge Function versions, and expected cron/Vault inventory.
- [ ] Watch 5xx, latency, Sentry, DB saturation, callback outcomes, queue lag, and drift.
- [ ] Complete controlled payment/SMS checks where change scope requires them.
- [ ] Record deployment URL/version, SHA, approver, checks, and stability-window result.

### Incident handoff/closure

- [ ] State impact, severity, blast radius, current mitigation, and remaining risk.
- [ ] Transfer timeline, dashboards, queries, provider tickets, and next decision time.
- [ ] Confirm financial reconciliation and tenant-isolation checks before closure.
- [ ] Create postmortem/actions with owners and dates; rotate exposed secrets.
- [ ] Update this runbook after every drill or incident reveals a gap.

## 15. Production Readiness Blockers

- [ ] Implement real liveness/readiness and dependency/job health reporting.
- [ ] Centralize redacted structured logs and end-to-end correlation.
- [ ] Instrument/approve SLOs and actionable burn-rate/payment/SMS/cron/capacity alerts.
- [ ] Make callback authentication mandatory and operationally supported.
- [ ] Separate callback-base and web-origin configuration; replace invalid keep-warm requests with harmless probes or remove them.
- [ ] Replace notification dequeue with atomic claim/lease, retry scheduling, idempotency, and DLQ.
- [ ] Add payment reconciliation monitoring and a safe integration pause control.
- [ ] Verify backup/PITR retention and complete an off-platform restore plus quarterly DR drill.
- [ ] Approve/test RTO and RPO; assign on-call ownership and provider escalations.
- [ ] Establish capacity baselines and production-like load tests.
- [ ] Clear all deployment and migration blockers in `DEPLOYMENT.md` and `DATABASE.md`.

Until these controls have executable evidence, **production operation and deployment remain blocked**.
