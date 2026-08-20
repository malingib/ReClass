# Deep Review — ReClass / eShule — 2026-08-20

**Reviewer:** OpenCode (Muse Spark) — implementation-grounded
**Scope:** `/home/malingi/Projects/Custom/ReClass` at commit `0.2.0` + 40 migrations (last observed `20260728000001`, `20260726000001`, `20260727000001`, `20260801/02`)
**Method:** static file review + reproduced commands (`lint`, `svelte-check`, `vitest run`, `vite build`, `verify_tenant_isolation.py`, `npm audit`, `ci.yml` + migration SQL inspection + Edge Function source)
**Evidence tier:** root docs `README/ARCHITECTURE/DATABASE/SECURITY/API/DEPLOYMENT/OPERATIONS/AUDIT/FINAL_REPORT` = tier 1; `docs/*` = historical (ignore where conflict); hosted Supabase/Vercel state = not evidenced (must verify live)

---

## A. Executive Verdict

**Overall 62/100 | Production Readiness 48/100 | Tech Debt 46/100 (100=healthy)**

Shippable for **single-tenant pilot with synthetic data and sandbox provider keys only**. Not shippable for multi-tenant production with real children's data, real money, or internet-exposed callbacks.

**Why:** The repo fixed 6 of the 8 July-critical blockers since `FINAL_REPORT 2026-08-01` — migration replay is now repair-patchable (`app.tenant_id()` added in `20260722000008`), credentials now encrypt via `encrypt_credential` RPC (`_platform/credentials.ts:123`), rate limiting is now distributed Postgres (`rate_limit_hit`), callbacks now fail-closed (`mpesa-callback/index.ts`), queue claiming is now atomic (`claim_notifications`), and student import is now bounded/allowlisted. Remaining single-tenant deployment is *honest* about RLS being inert (`supabase/server.ts:44` comment). The remaining production blockers are: (1) RLS-inert service-role single-tenant assumption cannot be safely promoted to multi-tenant without composite FKs + JWT RLS or a privileged data layer, (2) 1 high npm vuln (`nanoid <3.3.18` GHSA-2v37-7h3g-55p8) + 6 low `cookie` transitive, (3) CSV formula injection still unneutralized, (4) error sanitization is over-broad and still leaks via fallback paths, (5) no hosted backup/PITR/restore drill evidenced, (6) no live DB cross-tenant denial tests ever run against hosted project.

The 121-test / 0-leak / 0-svelte-error green baseline proves source compiles, not that tenant isolation or money or SMS actually works end-to-end. The next gate is `supabase db reset` twice + `supabase db query tenant_isolation.sql` on a fresh project, not more features.

---

## B. Scorecard (0-100, higher healthier)

| Dimension | Score | 2026-08-01 | Δ | One-line rationale |
|---|---:|---:|---:|---|
| Product breadth | 78 | 73 | +5 | Finance (KCB/Buni), remedial, SIS, communications all present; exams intentionally dropped |
| Architecture | 65 | 58 | +7 | Modular monolith is correct shape; target diagrams honest; single-tenant RLS-inert choice is now documented, not hidden |
| Code quality | 68 | 61 | +7 | `withTenant`/`paginatedQuery`/`loose` client helpers, structured logging; still route-heavy |
| Security | 58 | 31 | **+27** | 6 critical/high SECs fixed or mitigated; residual: CSV injection, single high npm vuln, inert RLS, broad `sanitizeError` |
| Database | 62 | 38 | +24 | `app.tenant_id()` helper fixes replay; `rate_limits`/`purge_retention`/composite? gaps remain |
| API / Integrations | 62 | 47 | +15 | STK/callback/receipt/bank channel cleanly split; callback now fail-closed, phone/amount verified |
| Frontend / UX | 70 | 67 | +3 | Shadcn+bones, CSP now present; 90 lint warnings (trivial `prefer-const`), zero a11y gate still |
| Testing | 64 | 51 | +13 | 17 files / 121 tests passing; DB job + tenant-isolation SQL now in CI (2026-08-20) — but never executed here |
| Performance | 58 | 53 | +5 | Bounded pagination, batched reminders, 50-row atomic queue claim; still no `pg_stat_statements` baselines |
| Scalability | 54 | 46 | +8 | Distributed limiter + atomic claim unlocks horizontal replicas; no partition/async export yet |
| DevOps / Ops | 58 | 30 | +28 | CI now has lint→isolation→typecheck→test→build→(e2e gated)→(database `db reset`) ; Docker now non-root |
| Documentation | 78 | 75 | +3 | Root audits still strong; single-tenant RLS note is now honest; `docs/` drift still not archived |
| AI readiness | 25 | 25 | 0 | No AI shipped — correct to keep it at 25 |
| Tech Debt (100=low) | 46 | 35 | +11 | Migration/credential/queue debt retired; composite FK + cross-tenant denial debt remains |
| **Overall** | **62** | **44** | **+18** | |
| **Production readiness** | **48** | **34** | **+14** | |

### Reproduced baseline (2026-08-20, this host)

```
npm run lint       → 0 errors, 90 warnings (all ui/* prefer-const, non-blocking)
svelte-check       → 0 errors, 0 warnings  (authoritative type gate — PASS)
vitest run         → 17 files, 121 tests PASS (rate-limit fail-closed tests log expected [rate-limit] errors)
vite build         → PASS, adapter-vercel runtime nodejs22.x, 102kB largest chunk (index.js)
verify_tenant_isolation.py src → 80 files scanned, 0 unscoped chains (hard CI gate PASS)
npm audit --audit-level=low → 7 vulns (6 low: cookie GHSA-pxg6-pf52-xh8x, 1 high: nanoid GHSA-2v37-7h3g-55p8)
```

> Note: `README` claims 154 tests; `FINAL_REPORT` claimed 81. Current truth is **121**. The delta is new `_finance`/`_remedial`/`_platform` helpers plus dropped exam routes — not a regression. Update `README` to 121 to stop drift.

---

## C. Top 10 Risks (prioritized)

| # | Severity | Finding | Evidence | Exploit sketch | Impact |
|---|---|---|---|---|---|
| R1 | **High** | Single-tenant `service_role` bypass is now the *documented* architecture — RLS is inert. Promoting to multi-tenant without DB enforcement is one missed `tenant_id` away from cross-tenant leak. | `src/lib/supabase/server.ts:44`, `src/lib/server/_auth/middleware.ts:42`, `ADMIN` comment | Add a new route, forget `tenant_id` filter (no compiler error; `loose` client accepts `any` table). Data from tenant A returned to tenant B user. | Cross-tenant disclosure of minors/PII/financials, KDPA breach |
| R2 | **High** | No composite `(tenant_id, id)` FKs — a row can still reference a parent from another tenant. Only `guardians_link` trigger checks tenant equality. | `supabase/migrations/20260712230000_core_tables.sql` + FK adds in `20260722000002` — all `REFERENCES id` only | Insert `exam_results`/`payments`/`messages` with attacker-supplied foreign UUID from another tenant (no DB error). | Referential contamination, report falsification |
| R3 | **High** | `nanoid <3.3.18` indefinite loop when size is zero + unpinned `cookie` transitive | `npm audit` 2026-08-20: 1 high, 6 low | Crafted `size=0` input to custom nanoid generator → DoS loop; `cookie` OOB characters to poison header | DoS / build-time header injection |
| R4 | **Medium** | CSV formula injection unneutralized | `src/lib/server/_platform/csv.ts:3` `escape` only doubles quotes, `src/routes/(app)/admin/(finance)/reports/*-csv/+server.ts` | Store `=HYPERLINK("https://evil", "Click")` in `first_name`/`admission_no` → admin opens export in Excel → exfil | Spreadsheet code execution / data exfil in admin context |
| R5 | **Medium** | `sanitizeError` is both leak-y and over-aggressive — splits on `\n` but still returns raw `error.message` length ≤200 if it doesn't match `/error|failed|exception/i`, and callers still `fail(500, {error: error.message})` in import/fee routes | `src/lib/server/_platform/log.ts:13-48`, `src/routes/(app)/admin/(sis)/students/import/+page.server.ts:102` | Submit duplicate `admission_no` → DB message leaks table name via fallback path | Reconnaissance, schema disclosure |
| R6 | **Medium** | Backup/PITR/restore **not evidenced** — `purge_retention()` exists but no hosted backup policy, RPO/RTO, or restore drill log | `supabase/migrations/20260727000001_retention_policy.sql`, `DATABASE.md §10` — no `supabase/config.toml` backup section | Disk failure / bad migration → data loss not recoverable within RTO | Permanent loss of payment/audit history |
| R7 | **Medium** | Hosted DB real isolation never proven — `supabase/tests/tenant_isolation.sql` exists in CI `database` job but has never run on a live project from this host | `.github/workflows/ci.yml:database` + `supabase/tests/tenant_isolation.sql` (new) | Deploy with a missing RLS policy or mis-granted `service_role` function → cross-tenant test would have caught it | Silent authz bypass in prod |
| R8 | **Medium** | `securityHeaders` uses `SAMEORIGIN` not `DENY`; `Permissions-Policy` still absent | `src/lib/server/_auth/middleware.ts:securityHeaders` | Clickjacking from same-origin compromised widget; unrestricted `camera/mic/geolocation` | Framing / capability abuse |
| R9 | **Low** | Exam/results module fully dropped — product gap if remedial grading was required; otherwise correct removal reduces attack surface | `supabase/migrations/20260802000001_drop_exam_module.sql` | N/A — feature gap | Schools expecting exam results will churn |
| R10 | **Low** | 90 lint `prefer-const` warnings pollute signal — real lint errors will be ignored | `npm run lint` output — all `src/lib/components/ui/*` | N/A — hygiene | Review fatigue, missed real issues |

---

## D. Detailed Findings by Dimension

### 1. Discovery & Inventory — ✅ Improved

**Observed:** SvelteKit modular monolith, 40 migrations (32→40 via `20260722xxxfix_app`, `20260726_rate_limit`, `20260727_retention`, `20260728_schema_domains`, `20260801_replace_exam_rpc`, `20260802_drop_exam`), 6 Edge Functions (`stk`, `mpesa-callback`, `notify`, `credentials-test`, `b2c`, `b2c-result`), 6 roles, finance split `school` (KCB/Buni/bank) vs `remedial` (M-Pesa), SIS, communications, `packages/@eshule/shared`, 17 Vitest files.

**Strengths:** Clear module grouping `src/lib/server/{_auth,_platform,_finance,_sis,_remedial,_communications,_dashboard}` + `supabase/functions/_shared/*`.

**Weaknesses:** Dead artifacts reduced but `docs/` still claims Next.js/public `/v1` API — now one year stale. Stale `database.types.ts` attendance field already corrected via schema_domains migration but types not regenerated in this review host.

**Target:** Archive `docs/*.md` with `> HISTORICAL — see /README.md + /AUDIT-2026-08.md` header.

### 2. Architecture — ✅ Honest Single-Tenant Choice

**Strengths:** Request flow `hooks.server.ts:initClients→correlationId→resolveSession→securityHeaders→routeGuard` is clean. Distributed `rate_limit_hit` RPC replaces per-process Map. Atomic `claim_notifications` replaces polling. Domain split bank/mpesa via `school_payment_channel`/`remedial_payment_channel` is correct Kenya-native design.

**Weaknesses:** The single-tenant comment `supabase/server.ts:44` is a virtue (honesty) and a debt (cannot onboard tenant #2 without migration). No outbox/CDC for STK saga — still three-phase (insert→Daraja→update). No durable broker.

**Recommendation:** Keep modular monolith for next 12 months. Before tenant #2, implement either (a) JWT-claim RLS (preferred Supabase-native) or (b) centralized `withTenant` data layer with `FORCE RLS` and composite FKs — not both, pick one and burn the ships.

### 3. Tenant Isolation — 🟡 Mitigated, Not Enforced

**Evidence:** `verify_tenant_isolation.py` now scans 80 files, 0 leaks (was 76). Script now understands `withTenant()`, `scope='platform'` null tenant, and `id`-scoped reads — fewer false positives. `global` tables allowlisted correctly.

**Still missing:** DB composite FKs. Every `REFERENCES tenants(id)` + child `tenant_id` should become `UNIQUE(tenant_id,id)` on parent + `FOREIGN KEY (tenant_id, parent_id)` on child. Current `FOREIGN KEY (id)` only — `tenant_id` can be wrong and DB won't complain.

**Required test (not yet run live):** `supabase/tests/tenant_isolation.sql` — must attempt as `anon`/`authenticated`/cross-tenant `service_role` to `SELECT/INSERT` foreign IDs from tenant A into tenant B and assert 0 rows.

### 4. Security (OWASP)

| Finding | Old | New | Evidence |
|---|---|---|---|
| SEC-001 credential plaintext | Critical | **Fixed** | `credentials.ts:123` now `sb.rpc('encrypt_credential', {p_json: JSON.parse(blob)})` → ciphertext stored. `validateProviderBlob` enforces `consumer_key/secret/passkey/shortcode + initiator_name/security_credential` + `api_token`. |
| SEC-002 service-role default | High | **Acknowledged** | Now documented as single-tenant RLS-inert; hardened for single-tenant, still blocks multi-tenant without FK/RLS rebuild |
| SEC-003 academic replacement | High | **Retired** | `replace_exam_results` RPC added with tenant lock/forbidden check (20260801) then module dropped (20260802) — destructive nontransactional route no longer exists |
| SEC-004 callback optional | High | **Fixed** | `mpesa-callback/index.ts:12` fails closed when `callbackSecret` absent; `verifySecret(actual, expected)`, method 405, `MAX_BODY_BYTES 10_240` with byte check, `billRef` routing, `amount/phone` strict mismatch → 409 |
| SEC-005 parent messaging | High | **Partially fixed** | Old `parent/messages/+server.ts` removed; new `comm_*` tables route via `conversation_id` with `tenant_id` scoping — still needs same-tenant participant check in RPC |
| SEC-006 bulk import | High | **Fixed** | `students/import/+page.server.ts: ALLOWED_FIELDS, MAX_IMPORT_BYTES 512KB, BATCH_LIMIT 500, MAX_FIELD_LENGTH 120`, streaming quote-aware `parseCsv`, status allowlist, 409 on `23505` |
| SEC-007 rate limiting | Medium | **Fixed** | `rate-limit.ts` now `srv.rpc('rate_limit_hit')` with `bucketKey = namespace:tenantId:key`, fail-closed for `login/stk/sms`; headers correct (`X-RateLimit-Limit = cfg.max`) |
| SEC-008 audit sparse | Medium | **Improved** | Single `grant_waiver` audit → more `audit_log` writes in payroll/waiver, but still not append-only (no `REVOKE UPDATE/DELETE`, no outbox export) |
| SEC-009 CSP | Medium | **Fixed** | `CONTENT_SECURITY_POLICY` now from `@eshule/shared`, set in `securityHeaders`; `Permissions-Policy` still missing |
| SEC-010 impersonation | Medium | **Partially fixed** | `impersonation_and_sms.sql` adds `impersonation_tokens` + `set_tenant_context(p_tenant,p_role)` — app must now bind via `set_tenant_context` and revoke tokens, still needs `Secure` flag audit |
| SEC-011 CSV injection | Medium | **Still open** | R3 above — `csv.ts:escape` not neutralizing `= + - @` |
| SEC-012 supply chain | Low | **Worse** | New high `nanoid` vuln; CI still pins `actions/checkout@v4`/`setup-node@v4` not SHA |
| SEC-014 queue duplication | Medium | **Fixed** | `notify/index.ts` now `claim_notifications(p_limit)` atomic + `claimed_at` lease + `backoff(attempts)=1/5/30m` + `MAX_BATCH 50` + inapp/sms split |

**OWASP posture:** A01 fixed for single-tenant; A03 injection fixed except CSV; A05 CSP fixed; A07 fail-closed limits fixed; A09 still weak; A06 regressed.

### 5. Database — ✅ Replay Fixed, Hardening Remains

**Replay:** `20260722000008_fix_app_tenant_id_helper.sql` creates `app.tenant_id()` BEFORE `20260722000006/007` use it — forward replay now succeeds. Clean state is `supabase db reset` twice + seed on disposable project — `ci.yml:database` now does this, previously didn't exist.

**Strengths:** `rate_limits` table + `rate_limit_hit` (atomic `INSERT ... ON CONFLICT ... RETURNING`), `purge_retention()` (365d audit / 90d sent/failed / 180d all / 1d rate_limits), `reconcile_payment` invoice lock `FOR UPDATE` + duplicate `mpesa_checkout_id` check + overpayment `partial_overpayment` handling (20260722000001), `platform_config` + `tenant_modules`.

**Gaps:** Composite tenant FKs absent (R2). `schema_domains` moves `audit_log` to `platform.audit_log` — verify app queries updated. `cleanup_notifications` weekly job may conflict with `purge_retention`. No `CREATE INDEX CONCURRENTLY` for prod. No explicit `pg_stat_statements`/`EXPLAIN` baselines.

**Required gate:** `supabase db reset --local --yes` twice; regenerate `database.types.ts`; run `tenant_isolation.sql` as `anon/authenticated/service_role`; rehearse upgrade from production snapshot.

### 6. API & Integrations — ✅ Correct Split

**STK (`supabase/functions/stk/index.ts`):** Verifies `parent→feeType→guardians_link` ownership, checks `school_payment_channel`/`remedial_payment_channel` bank gate, normalizes `phone` to `254...`, dedupes pending `checkout_requests`, inserts `pending` row before Daraja OAuth→STK Push, uses `accountRef = admission_no.slice(0,12)`, retries OAuth fetch `MAX_RETRIES 3` with exponential backoff — strong.

**Callback (`mpesa-callback/index.ts`):** Fail-closed secret, body cap, amount/phone mismatch 409, `reconcile_payment` RPC with row lock, deterministic receipt `RCP-${tenant:6}-${YYYYMMDD}-${checkout:5}`, idempotent duplicate check, unmatched `BillRefNumber` parked in `unmatched_payments` — strong saga.

**Notify (`notify/index.ts`):** `claim_notifications(p_limit)` atomic, `MAX_BATCH 50`, senderId cached per tenant, per-tenant credential `resolve→decrypt`, `inapp` marked `sent` without SMS, timeout 10s, bearer redaction, backoff 1/5/30m — strong.

**Remaining:** No common error envelope. Health (`/api/healthz`) not verified DB-deep; should add `SELECT 1` + job-lag check.

### 7. Frontend / A11y — 🟡 Solid but Ungoverned

CSP present via `@eshule/shared`. `DataTable`, `AppShell`, responsive. 90 `prefer-const` lint warnings are trivial auto-fix. Zero `axe`/Lighthouse/keyboard proof — cannot claim WCAG. Notification read state still `localStorage` (device-local, unbounded).

**Fix:** `npm run lint -- --fix` to clear 90 warnings; add `vitest-axe` or `playwright` a11y spec; store `notification_reads` server-side.

### 8. Backend / Service Layer — ✅ Modularizing

`_finance/{bank-payments,feeTypeCrud,payroll,receipts}`, `_remedial/scheduling`, `_platform/{credentials,query,log,rate-limit,csv}` reduce route size. `loose` client avoids `keyof Tables → never` deep-instantiation. `logError` + `sanitizeError` centralized.

**Gap:** `sanitizeError` still regex-fragile (`/error|failed|exception/i` triggers fallback for legitimate messages like "Failed to import" — but callers pass fallback anyway). Prefer allowlist error codes (`DUPLICATE_ADMISSION`, `CREDS_NOT_FOUND`) over message scrubbing.

### 9. Testing — ✅ Now Has DB Gate (Unproven Live)

17 files 121 PASS vs old 81/8. New: `rate-limit.test.ts` (fail-closed), `credential-security.test.ts`, `bank-payments.test.ts`, `remedial-b2c.test.ts`, `platform-config.test.ts`, `schema-prune.test.ts`. CI now has `database` job (`setup-cli → supabase start → db reset → tenant_isolation.sql`). E2E gated on secrets.

**Missing proof:** `database` job has never succeeded on this host (Supabase Docker not started here). `tenant_isolation.sql` draft may need `psql` role syntax.

### 10. Performance — 🟡 Bounded, Not Measured

Positive: `paginatedQuery` does `Promise.all(count + data)` with `range(offset, pageSize)`, `attendance`/`payroll` RPCs, batched reminders, `claim_notifications` 50 limit.

**Next:** Add `statement_timeout`, `pg_stat_statements`, slow-query log, and `EXPLAIN (ANALYZE, BUFFERS)` on prod-like volume (10k students, 100k notifications) before optimizing.

### 11. DevOps / Delivery — ✅ Now Reproducible

`ci.yml` now runs: `npm ci` → `npm audit --high` → `lint` → `verify_tenant_isolation.py` → `typecheck` → `test` → `build` → (e2e gated) → (database `db reset`). Docker fixed: non-root `appuser`, `USER appuser`, `ENV NODE_ENV=production`, `EXPOSE 3000`. `svelte.config.js` pinned `runtime: 'nodejs22.x'` for Node 22/26.

**Still missing:** Tag-pinned Actions not SHA-pinned; no `.dockerignore` verification; no image SBOM/signing; no canary/rollback runbook.

### 12. AI — ⏸ No AI Shipped (Correct)

Keep at 25. Prerequisites before any AI touches grades/payments: tenant opt-in, no training on school data, isolated vector store per tenant, eval harness, human-in-loop for academic decisions.

### 13. Documentation — ✅ Mostly Honest

Single-tenant RLS note is now in code comment — strong honesty. `AUDIT-2026-08.md` + `FINAL_REPORT.md` (2026-08-01) are current tier 1. `docs/*` still stale — archive it.

---

## E. Migration & Replay Verdict

**Can `supabase db reset` succeed on a clean project? YES — if `20260722000008` is present before `20260722000006/007`. It now is.** Pre-2026-08-08 this was P0-blocked; now forward-fix repairs it. History files are retained so live DBs that already applied `20260722000006/007` remain upgradeable (helper is `CREATE OR REPLACE`).

**What hosted state must be inventoried before any prod migration:**
1. `supabase migration list` vs files (drift?)
2. `select * from pg_policies where schemaname='public'`
3. `vault.decrypted_secrets where name='reclass_kek'` exists?
4. `cron.job` entries (purge_retention vs old cleanup)
5. `storage.buckets/policies` (not in repo)
6. Auth settings (public signup disabled? DPA retention?)

**Plan:** Expand/backfill/validate/contract — add composite FKs as `NOT VALID` → backfill fixes → `VALIDATE CONSTRAINT` → contract old FK. Never squash history without a tested bridge to existing DBs.

---

## F. Release-Blocking Checklist (updated 2026-08-20)

- [x] Repair `app.tenant_id()` policies and prove clean replay — **DONE** (`20260722000008`, needs `db reset` evidence)
- [x] Encrypt credentials via RPC, rotate old plaintext — **DONE** (rotate any pre-2026-08 plaintext now)
- [x] Require & verify M-Pesa callback secret (`x-callback-secret`, 10KB cap) — **DONE**
- [x] Bound & validate student imports (500 rows, 512KB, allowlist) — **DONE**
- [x] Shared distributed rate limits + atomic queue claims — **DONE** (`rate_limit_hit`, `claim_notifications`)
- [ ] CSV formula injection neutralization — **OPEN** (R4)
- [ ] Composite tenant FKs + negative cross-tenant tests — **OPEN** (R2)
- [ ] `nanoid` high vuln + `cookie` low fixes — **OPEN** (R3)
- [ ] Append-only `audit_log` (revoke update/delete, export) — **PARTIAL**
- [ ] Hosted `db reset` + `tenant_isolation.sql` green on live disposable project — **OPEN** (R7)
- [ ] Backup/PITR/restore drill with evidence — **OPEN** (R6)
- [ ] `Permissions-Policy`, `X-Frame-Options: DENY` assessment — **OPEN** (R8)
- [ ] Hosted Supabase config verification (Auth, Vault, cron, network) — **OPEN**

---

## G. Sequenced Action Plan

### Next 24 Hours (0.5–1 day, stop-unsafe-change)

1. **Freeze live-data use** — keep pilot on synthetic data.
2. **Regenerate types:** `supabase gen types typescript --local > src/lib/supabase/database.types.ts` and commit; update `README` 154→121 tests.
3. **Fix CSV injection:** in `src/lib/server/_platform/csv.ts` prefix `=+-@` cells with `'`, add test `csv.test.ts`.
4. **Fix npm vulns:** `npm audit fix` for `nanoid`, then `npm audit` re-run; if `cookie` requires `npm audit fix --force` (SvelteKit breaking), pin decision to issue with risk acceptance.

### Next Week (3–7 days, establish state)

5. **Prove DB gates:** on a **disposable** local Supabase — `supabase start && supabase db reset --local --yes && supabase db reset --local --yes && supabase db query --local --file supabase/tests/tenant_isolation.sql` — attach log to PR.
6. **Snapshot hosted inventory:** capture `migration list`, `pg_policies`, `vault` presence, `cron.job`, Auth settings — store in `supabase/hosted-inventory-2026-08-20.md` (no secrets).
7. **Harden errors:** replace raw `error.message` surfaces with code map (`DUPLICATE_ADMISSION: 409`, `INVALID_CREDENTIALS: 400`) + `sanitizeError` fallback only.

### Next Month (2–4 weeks, enforcible boundary)

8. **Composite FKs:** add `UNIQUE(tenant_id,id)` on `tenants`-ref'd parents + `FOREIGN KEY (tenant_id, parent_id)` on all tenant children; backfill/validate/contract with downtime window.
9. **Append-only audit:** `REVOKE UPDATE,DELETE ON platform.audit_log FROM authenticated, anon`; export to object storage nightly; add `purge_retention` audit.
10. **A11y & E2E:** `npx playwright test` with `axe-core` on `/(admin|teacher|parent|bursar)/**` and denial scenarios (cross-tenant ID substitution → 404/403).
11. **Observability:** add `/api/healthz` DB probe (`SELECT 1` + `pg_stat_activity` + job lag), ship `X-Request-Id` to Edge logs.

### Next Quarter (1–3 months, safe to scale)

12. **Pagination & async exports:** cursor/keyset for `payments/notifications/audit_log`; async CSV via signed URL for >5k rows.
13. **Partition & pool:** range-partition `notifications`/`platform.audit_log` by month when >1M rows; enable Supabase pooler `statement_timeout`.
14. **Offboarding & DPA:** tenant export ZIP (students/payments/messages) + anonymization workflow + `LEGAL_HOLD` flag — required before KDPA-regulated onboarding.

---

## H. Verification Commands (run on repository root)

```bash
# 1. Static + unit gates (must be green, no secret values needed)
npm ci
npm run lint                    # expect 0 errors (90 prefer-const warnings until fixed)
python3 scripts/verify_tenant_isolation.py src   # expect 0 leaks across ~80 files
npm run typecheck               # svelte-check: 0 errors, 0 warnings
npm run test -- --run           # expect 17 files / 121 passing
npm run build                   # expect Vercel adapter success, nodejs22.x

# 2. Dependency gates
npm audit --audit-level=high   # must be 0 high after nanoid fix
npm audit --audit-level=low    # track remaining 6 low cookie

# 3. Executable DB gates (requires Docker + Supabase CLI)
supabase start
supabase db reset --local --yes
supabase db reset --local --yes   # twice proves idempotent clean replay
supabase gen types typescript --local > src/lib/supabase/database.types.ts
supabase db query --local --file supabase/tests/tenant_isolation.sql

# 4. Operational probes (against disposable project, never prod)
psql "$LOCAL_DB_URL" -c "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname='public' AND relkind='r' ORDER BY relname;"
psql "$LOCAL_DB_URL" -c "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;"
supabase functions serve --env-file .env   # then curl STK with invalid parent → 403, duplicate pending → 429

# 5. E2E (requires seeded test user + PUBLIC_SUPABASE_URL etc.)
npm run test:e2e:install
npm run build && npm run preview &   # or use e2e.full-suite.config.ts
npx playwright test --reporter=list
```

---

**Files to read first:** `AUDIT-2026-08.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `FINAL_REPORT.md`, `src/hooks.server.ts`, `src/lib/supabase/server.ts`, `src/lib/server/_auth/middleware.ts`, `src/lib/server/_platform/credentials.ts`, `src/lib/server/_platform/csv.ts`, `supabase/migrations/20260722000008_fix_app_tenant_id_helper.sql`, `supabase/functions/mpesa-callback/index.ts`, `supabase/functions/stk/index.ts`, `supabase/functions/notify/index.ts`, `.github/workflows/ci.yml`

**Reviewer note:** This repo moved from 44→62 in three weeks by fixing the *right* things (encryption, isolation scanner, distributed limits, atomic queues, bounded imports). The next 62→85 is not features — it's proving the DB on a real host, adding composite FKs, and running the operations you already wrote.
