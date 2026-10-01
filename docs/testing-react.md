# eShule React SPA — Testing Strategy (`apps/web-react` + Supabase)

> Scope: React Vite SPA (`apps/web-react/src`) + Supabase Postgres + Edge Functions.
> Companion docs: `docs/testing.md` (repo-wide verification contract),
> `docs/api-react.md` (Edge/RPC contracts, idempotency, callback security),
> `docs/database-react.md` (tenancy model, RLS matrix, P0 checklist),
> `SECURITY.md` §11 (evidence-based release gate), `ROADMAP.md` (E2E needs a
> configured non-production environment), `TESTING-GUIDE.md` (legacy
> health/circuit-breaker probes for the Svelte surface — do not treat as React gates).
> Keep all fixtures synthetic. Never use production data, credentials, receipts, or PII.

## 1. Test pyramid

| Layer | Tool | What it proves | Examples |
|---|---|---|---|
| Unit (base, fast, most tests) | Vitest (`apps/web-react/vitest.config.ts`: `src/**/*.{test,spec}.{js,ts,tsx}`, `environment: node`, `@` → `src`) | Pure logic with zero network | Money math (KES minor-unit rounding, `amount > 0`, overpay/waiver balance guards); `lib/rbac.ts` matrix (12 roles, route groups, permission `.some` semantics); payroll/state machines (`draft → approved → paid`, B2C `approved → processing`); CSV column mapping; phone normalization `→ 254[17]………` |
| Integration (middle) | Vitest + Supabase test project (anon / authenticated / `service_role` clients) + Edge runtime | Contracts hold against a real database | `reconcile_payment` idempotency; `grant_waiver` threshold/atomicity; RLS negative matrix per role; callback replay; concurrent waiver+pay; queue claim under concurrency |
| E2E (top, few, seeded non-prod only) | Playwright (`apps/web-react/playwright.config.ts`: `testDir ./e2e`, `baseURL http://localhost:5173`, `webServer: npm run dev --workspace=@eshule/web-react`) | Critical journeys work per role in a browser | Login → role home → finance / ReClass / payroll / parent-pay journeys on seeded non-prod (see §6); reuse one authenticated `storageState` per role — do **not** log in per test (login bucket is `10/min per IP`, `docs/api-react.md` §9) |
| Performance | k6 (staging only) | Budgets hold under load (§7) | STK-init burst, bursar receipt search at 100k rows, `claim_notifications` claim latency |
| Security scan | OWASP ZAP baseline/full | No critical/high findings | Run against seeded non-prod; file findings as issues with evidence, never with real data |
| Accessibility | axe-core + keyboard review | §8 checks pass | `axe-playwright` on login, dashboards, finance tables, pay flows, dialogs |

`vitest.config.ts` uses `environment: node` — DOM/component tests need `jsdom` +
Testing Library installed per-file (`// @vitest-environment jsdom`), not a global switch.

### Test file layout

| Location | Contents |
|---|---|
| `apps/web-react/src/**/*.test.{ts,tsx}` | Unit: `lib/money.*`, `lib/rbac.*`, `lib/phone.*`, state-machine helpers, CSV mappers |
| `supabase/tests/rls-negative.test.ts` | RLS matrix: anon / authenticated / `service_role` × tenant A/B (new — does not exist yet) |
| `supabase/tests/callback-replay.test.ts` | Replay + mismatch + overpay cases against sandbox-shaped payloads (new) |
| `supabase/tests/finance-concurrency.test.ts` | Concurrent STK, waiver+pay, queue claim (new) |
| `apps/web-react/e2e/*.spec.ts` | Playwright per-role suites on seeded non-prod (only `smoke.spec.ts` exists today) |
| `perf/*.js` | k6 scenarios (new): `stk-burst.js`, `bursar-search.js`, `notify-claim.js` |
| `e2e/a11y.spec.ts` (React) | axe scans per route (new) |

Unit tests mock Supabase clients at the module boundary (`vi.mock('@/integrations/supabase/client')`);
integration tests use real clients against the seeded test project so RLS actually executes.
A test that never touches RLS proves nothing about isolation — say which layer it ran in.

## 2. Commands

| Purpose | Command |
|---|---|
| Lint (React workspace) | `npm run lint --workspace=@eshule/web-react` |
| Typecheck (React) | `npm run typecheck --workspace=@eshule/web-react` (also root `npm run typecheck` → `apps/web-react/tsconfig.json`) |
| Unit tests | `npm run test --workspace=@eshule/web-react` (`vitest run`) / watch: `test:watch` |
| Production build | `npm run build --workspace=@eshule/web-react` (`tsc --noEmit && vite build`, `outDir dist`) |
| Preview (matches root Playwright port) | `npm run preview --workspace=@eshule/web-react` |
| React E2E (dev server on `:5173`) | `npx playwright test --config apps/web-react/playwright.config.ts` |
| React E2E (single suite) | `npx playwright test --config apps/web-react/playwright.config.ts e2e/<suite>.spec.ts` |
| Legacy Svelte E2E (preview `:4173`, setup → chromium) | `npm run test:e2e` / `npm run test:e2e:dev` / `npm run test:e2e:audit` (see root `playwright.config.ts`) |
| Migration replay (P0 gate, run twice from zero) | `supabase db reset` (local) then hosted `supabase db push --dry-run && supabase db push`; repeat `db reset` a second time |
| Drift queries (must return 0 rows) | `psql "$DATABASE_URL" -f docs/queries/drift.sql` (cross-tenant FK drift, invoice cache drift — `docs/database-react.md` appendix) |
| RLS negative suite | `npx vitest run supabase/tests/rls-negative.test.ts` (anon + authenticated + `service_role`, two tenants) |
| Callback replay / concurrency | `npx vitest run supabase/tests/callback-replay.test.ts supabase/tests/finance-concurrency.test.ts` |
| Perf smoke | `k6 run perf/stk-burst.js && k6 run perf/bursar-search.js` (non-prod only) |
| ZAP baseline | `zap-baseline.py -t "$STAGING_URL" -r zap-baseline.html` |
| Axe (in Playwright) | `npx playwright test --config apps/web-react/playwright.config.ts e2e/a11y.spec.ts` |

Current React E2E coverage is one file (`apps/web-react/e2e/smoke.spec.ts`: login
renders, protected-route bounce, 404). Root `e2e/` (`app`, `role-auth`, `finance-crud`,
`receipts-smoke`, `walk-all`, audits) targets the legacy Svelte preview server and is
**not** React evidence — port per-role suites into `apps/web-react/e2e/` before release.

### Planned React E2E suites

| File | Covers |
|---|---|
| `e2e/smoke.spec.ts` (exists) | Login renders, auth bounce, 404 |
| `e2e/auth-roles.spec.ts` | Login per role → correct home; disallowed route → `/login`; `storageState` reuse |
| `e2e/parent-pay.spec.ts` | Balance → STK push → sandbox reconcile → receipt; duplicate 429; mismatch case |
| `e2e/bursar-finance.spec.ts` | Outstanding → reconcile → waiver → receipt search → gap report → CSV cap |
| `e2e/reclass-governance.spec.ts` | Queue → approve/reject → audit evidence; marker≠approver denial |
| `e2e/payroll.spec.ts` | Generate → approve → B2C sandbox payout → evidence; treasurer≠chairman |
| `e2e/a11y.spec.ts` | axe scans + keyboard pass per critical route |

### Required environment variables (non-prod CI)

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser client + Playwright |
| `SUPABASE_SERVICE_ROLE_KEY` (protected secret) | Integration tests, Edge invocation, RLS `service_role` leg |
| `DATABASE_URL` (test project) | Migration replay, drift queries, `pg_policies` dump |
| `STAGING_URL` | Playwright `baseURL` override, ZAP target, k6 target |
| Daraja/Mobiwave sandbox creds (protected) | `stk`, `mpesa-callback`, `notify` sandbox paths only |

## 3. Fixtures and seed data

- Synthetic only. Never production data, real phone numbers, real M-Pesa receipts,
  real credentials, or student PII. Provider sandbox secrets live in protected CI env,
  never in fixtures or logs.
- Deterministic identifiers so replays are comparable across runs:
  `admission_no` like `TSTA-0001` (≤ 12 chars — M-Pesa `AccountReference` limit),
  `BillRefNumber = admission_no`, `checkout_id = CHK-<suite>-<n>`,
  `receipt_no = RCP-<TENANT6>-<YYYYMMDD>-<CHK5>` (matches `reconcile_payment` derivation).
- Two tenants minimum (`TENANT_A`, `TENANT_B`) with mirrored students/fees/invoices so
  every high-risk read/write has a same-tenant success case and a cross-tenant denial case.
- One user per role under test (bursar, parent + guardian link, teacher, reclass chair /
  treasurer / member, payroll operator, principal, school_admin). Parents get normalized
  `2547………` sandbox phones; teachers get phone + `id_number` so B2C pre-flights pass.
- Seed via idempotent SQL (`supabase/seed/test-seed.sql`) + `supabase db reset` before
  each integration/E2E run. Tests must not log secrets, tokens, full phones, or student names.

## 4. Critical test cases (must exist and pass)

1. Cross-tenant reads blocked — user A selects tenant B `students/invoices/payments/
   receipts/payroll/notifications` → 0 rows; as anon **and** authenticated.
2. Cross-tenant writes blocked — insert/update with attacker-controlled `tenant_id` or
   foreign key (`invoice.student_id`, `payment.invoice_id`) → RLS denial or FK violation,
   no mutation; drift queries return 0 rows.
3. Marker ≠ approver — teacher who marked attendance cannot approve the same occurrence (403).
4. Treasurer ≠ chairman — payroll `claim_payroll_run` by preparer, payout approval by a
   different authorized role; same-actor approve → 403/409.
5. STK duplicate — second push for same `(fee_type_id, student_id)` while one is `pending`
   → `429 DUPLICATE_REQUEST`; concurrent STK ×2 → exactly one `pending` row (partial unique).
6. Callback replay — same `CheckoutRequestID` posted twice → first `completed`, second
   `200 { status: 'already_reconciled' }`, exactly one `payments` row, one receipt.
7. Amount/phone mismatch — callback `Amount ≠ checkout.amount` or digit-normalized phone
   mismatch → checkout `failed`, `409 amount_mismatch|phone_mismatch`, case queued for bursar.
8. Overpay — amount above outstanding → parked as case / `unmatched_payments`, never silent credit.
9. Waiver threshold — `grant_waiver` above outstanding → `exceeds_balance`; full cover flips
   invoice to `waived` + `audit_log waiver_granted`; concurrent waiver + callback preserves balance.
10. Receipt gap report — missing `receipt_no` in a paid sequence surfaces in the bursar report.
11. STOP honors — opt-out (`notifications.status = 'optout'`) suppresses further SMS to that recipient.
12. Queue claim single-send — concurrent `claim_notifications` ×2 → disjoint sets; one send per
    SMS under Mobiwave mock; stale `processing` reclaimed only after the 5-minute lease.
13. Pagination no truncation — bursar/parent lists use keyset or `.range()` with explicit limits;
    test at > page size proves no silent 1000-row PostgREST cap.
14. Impersonation/support access — expiry enforced, every action under impersonation writes
    `audit_log` with actor + tenant + resource + result.

Expected-status quick reference (see `docs/api-react.md` §§7–8, 10 for the full vocabulary):

| Case | Expect |
|---|---|
| Same-tenant authorized | `200` + state change + audit row |
| Same-tenant unauthorized / cross-tenant | `403`, or 0 rows for RLS-filtered reads; no mutation |
| Missing/expired identity | `401` |
| Duplicate STK / rate-limit breach | `429 DUPLICATE_REQUEST` (+ `Retry-After` for rate buckets) |
| Replay of settled callback | `200 already_reconciled` / `duplicate`, row counts unchanged |
| Amount/phone conflict, bad transition | `409` (+ bursar case row where money is involved) |
| Unknown admission on manual paybill | `200 unmatched_admission` + `unmatched_payments` row, never force-fit |
| Oversized / wrong-method callback | `400 body_too_large` / `405 method_not_allowed` |

Concurrency harness notes: run each race (STK×2, callback×2, waiver+pay, claim×2)
at least 20 iterations against the seeded test project; assert row counts, not just status
codes — a `200` that mints two `payments` rows is a failure. Use `Promise.allSettled`
(or `xargs -P`) so requests genuinely overlap; serialize-then-assert proves nothing.

## 5. Release gates (all green or no release)

Per `SECURITY.md` §11 the gate is evidence-based — link the CI run, not a claim:

- [ ] `lint` green (`@eshule/web-react`).
- [ ] `typecheck` green (`tsc --noEmit`).
- [ ] Unit tests green (money math, RBAC, state machines).
- [ ] Integration green: RLS negatives (anon/authenticated/`service_role`), RPC
      reconcile/waiver, callback replay, concurrency — on a seeded non-prod database.
- [ ] Critical Playwright suites green per role on seeded non-prod (ported React suites,
      not legacy Svelte specs).
- [ ] Migration replay green **twice from zero** (`supabase db reset` ×2) + hosted dry-run.
- [ ] Drift queries return **0 rows** (cross-tenant FK drift, invoice cache drift).
- [ ] `pg_policies` dump shows `tenant_read`/`tenant_write_staff` (+ `no_anon_write`,
      `own_roles_read`) on all in-scope tables (`docs/database-react.md` §10 P0-1).
- [ ] Axe checks pass agreed thresholds; no unreviewed keyboard traps.
- [ ] ZAP: no unaccepted critical/high finding.
- [ ] Perf budgets met (§7) on non-prod with realistic volumes.
- [ ] Production build succeeds via the supported path (`vite build`, `dist/`).
- [ ] Do not claim a gate passed when the environment or provider integration was not
      actually exercised (sandbox callbacks, restore drill — see §9).

### Suggested CI order (fail fast, cheapest first)

```yaml
# .github/workflows/web-react.yml (sketch — authoritative config lives in the repo)
jobs:
  static:       # eslint + tsc --noEmit
  unit:         # vitest run (apps/web-react)
  db-reset-1:   # supabase db reset from zero
  integration:  # RLS negative + RPC + replay + concurrency (needs db-reset-1)
  db-reset-2:   # second reset from zero (P0-1 evidence)
  drift:        # drift queries + pg_policies dump (needs db-reset-2)
  e2e:          # Playwright React suites on seeded non-prod (needs integration)
  perf-zap-axe: # k6 smoke + ZAP baseline + a11y (needs e2e, non-prod only)
  build:        # vite build (needs static, unit)
```

Cache `node_modules` and the Playwright browser build between jobs. Upload the Playwright
HTML report, `pg_policies` dump, drift-query output, and k6 summaries as run artifacts —
those files **are** the release evidence `SECURITY.md` §11 asks for.

## 6. UAT checklist per role (seeded non-prod, scripted + exploratory)

| Role | Script |
|---|---|
| Parent | Login → linked child → outstanding balance correct → STK push → callback sandbox → receipt visible → ledger updated; duplicate push shows friendly 429; wrong-amount callback shows case, not credit. |
| Bursar | Finance centre → outstanding list paged (no truncation) → reconcile sandbox payment → waiver within threshold (over-threshold rejected) → receipt search by no/phone → gap report reviewed → CSV export ≤ 5000 rows. |
| Teacher / remedial teacher | Today's work → assigned session → attendance/delivery submit → cannot self-approve; status/approval feedback visible. |
| ReClass chair / secretary / treasurer / member | Governance queue → eligible review → approve/reject with audit evidence; treasurer payout vs chairman approval separation holds. |
| Payroll operator | Eligible components → run generate (no duplicate `tenant/teacher/period/domain`) → approve → B2C sandbox payout → evidence, not just run status. |
| Principal | Command centre read-only oversight → sees aggregates, cannot silently act as bursar/payroll/ReClass operator (denied actions logged). |
| School admin | Staff/student CRUD → role/hat assignment → derived navigation correct → denied actions actually denied server-side. |

Each UAT row records tester, date, commit/env, pass/fail, and linked evidence (screenshots
without PII, Playwright trace, or audit-log excerpt).

## 7. Performance budgets (non-prod, realistic volumes)

| Surface | Budget (P95) |
|---|---|
| LCP, critical pages (login, dashboards, finance list) | ≤ 2.5 s |
| Authenticated API read (paged list, dashboard aggregate) | ≤ 400 ms |
| Authenticated API write (waiver, approve, claim) | ≤ 800 ms |
| STK init round-trip (pre-insert → Daraja accept) | ≤ 5 s (then async callback) |
| `claim_notifications` batch (50) | ≤ 800 ms, no seq scan (`EXPLAIN` hits `idx_notifications_claimable`) |
| Bursar receipt search at 100 k paid rows | ≤ 800 ms, bitmap on `idx_payments_receipt_phone`, no seq scan |

Measure with k6 + `EXPLAIN (ANALYZE, BUFFERS)` on the hot queries
(`docs/database-react.md` §7). Any budget miss blocks release or ships with a recorded
exception + follow-up index/partition task. Keyset pagination everywhere past trivial
lists; never rely on unbounded `.select()`.

Methodology: warm the app first (one unmeasured iteration), then record P50/P95/P99 over
≥ 100 samples per scenario; report the database size (e.g. 100k paid rows) alongside every
number — a P95 without a row count is not evidence. Run perf against the seeded staging
project, never production. k6 thresholds should fail the run (`thresholds: { http_req_duration:
['p(95)<400'] }`) so budgets gate CI instead of living in a dashboard nobody reads.

## 8. Accessibility checks

- Automated: `axe-playwright` (or `@axe-core/playwright`) on login, each role home,
  finance tables, pay/waiver dialogs, 404/empty/loading/error states; fail on
  `critical` + `serious`, triage `moderate`.
- Keyboard: full critical journey without a mouse (login → pay → receipt; attendance
  submit; approve flow); visible focus, no traps, dialogs return focus on close.
- Semantics: one `h1` per route, labelled inputs, table headers, `aria-live` for async
  payment/claim status, colour-plus-text (never colour-only) for statuses.
- Contrast + zoom: text contrast ≥ 4.5:1, UI ≥ 3:1; usable at 200 % zoom and 360 px width.
- Reduced motion respected; no information conveyed by animation alone.
- Assistive-technology spot check per release: screen-reader pass over login, one dashboard,
  and the parent-pay flow (landmarks, announcements, table navigation); log the tool +
  version with the evidence.
- Empty/loading/error states are in scope for axe + keyboard review (see `ROADMAP.md`
  hardening list) — skeletons must not trap focus and error messages must be announced.

## 9. Production verification (after staging gates, before/after go-live)

1. Sandbox callbacks end-to-end against staging: STK push → Daraja sandbox callback →
   `reconcile_payment` → receipt + SMS (Mobiwave sandbox) → replay same callback →
   `already_reconciled`, zero duplicates.
2. Manual paybill paths: unknown `admission_no` → `unmatched_payments` + bursar triage;
   missing ref → `missing_bill_ref`, no row forced into `payments`.
3. Restore drill: restore backup/PITR to an isolated project, time it, verify balances,
   receipts, and audit rows; record the report (see `docs/dr-runbook.md` where present).
4. Observability: health checks, error budgets, STK/callback metrics, queue-depth and
   stuck-`processing` alerts, audit-log shipping — all verified firing, not just configured.
5. Rollback/roll-forward rehearsal for the release's migrations (expand-and-contract;
   no destructive ledger migration without archive + legal hold per `docs/database-react.md` §8).
6. Post-deploy smoke on prod: login, one read-only journey per role, receipt search,
   queue health query — then close the release with linked evidence in the changelog.
7. Keep an incident owner + escalation path named per release (see `SECURITY.md` §10):
   who gets paged for stuck-`processing` growth, callback 5xx spikes, or restore requests,
   and where the runbook lives.

## 10. Failure evidence and doc maintenance

When a test fails, record (per `docs/testing.md` §9): exact commit/environment, failing
test + reproducible input, expected vs actual, security/data impact, remediation +
regression test, and whether production is affected or the issue is source-only. File
exploitable isolation or payment issues privately with synthetic reproductions only
(`SECURITY.md` §12).

This strategy is a verification contract, not a claim that all gates are green. Update it
when contracts change: new Edge Function or RPC → add its integration + E2E rows here;
new rate-limit bucket → update the commands/env table and the replay expectations;
new role or permission → extend the RBAC unit tests, the RLS matrix, and the UAT table
in the same PR.
