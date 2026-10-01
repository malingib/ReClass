# eShule React SPA — Security Model (`apps/web-react` + Supabase)

> Scope: React Vite SPA (`apps/web-react/src`) on Supabase Auth + PostgREST +
> `rpc()` + Edge Functions. Browser uses the **anon key only**; privileged work
> runs server-side. Keep examples synthetic — no real credentials, receipts, or PII.
> Source anchors: `SECURITY.md` (priorities, trust model, invariants),
> `supabase/migrations/20260909120000_react_spa_rls_hardening.sql`,
> `supabase/functions/{stk,mpesa-callback,notify}/index.ts`,
> `apps/web-react/src/lib/rbac.ts` + `components/ProtectedRoute.tsx`,
> `docs/api-react.md` (§8 error vocabulary, §9–§10 limits/callbacks).

Security priorities (from `SECURITY.md`, in order): tenant isolation; authorization
and separation of duties; financial integrity; credential/secret protection;
student/parent/staff data protection; availability and recovery; observability
and auditability.

## 1. Trust model

```text
Browser (untrusted, anon key only)
  -> Supabase Auth (session/JWT) + PostgREST under RLS
  -> Edge Functions (verifyAuth/verifyAdmin, service_role) — authorization boundary
  -> Postgres RPC (SECURITY DEFINER, service_role-only grants) + domain writes
  -> External providers (Daraja M-Pesa, Mobiwave SMS)
```

Rules:

- The **browser is untrusted**. UI visibility (`ProtectedRoute`, role menus,
  `useAuthorization`) is usability only — **never the authorization boundary**.
- Every privileged decision is re-checked server-side: Edge verifies the JWT via
  `verifyAuth()` (`_shared/auth.ts` → `getUserClient(token).auth.getUser()`),
  resolves tenant from `user_roles`/`parents`, and re-validates ownership.
- Direct browser writes are limited to what RLS allows; state transitions
  (waivers, payroll approve/mark-paid, reconciliation, credential decrypt,
  notification claims) go through RPC/Edge with `service_role` only.
- Provider callbacks are untrusted input until secret-gated, size-capped, and
  bound to stored transaction state (§9).

## 2. Threat model

| # | Threat | Impact | Mitigation (where) |
|---|---|---|---|
| T1 | Spoofed `tenant_id` in browser query/body | Cross-tenant read/write | RLS `tenant_read` / `tenant_write_staff` keyed on `tenant_ids_for_user()`; every query adds `.eq('tenant_id', ctx.tenantId)`; Edge re-scopes all refs (`fee_types`, `students`, `checkout_requests`) to the grant tenant |
| T2 | IDOR / cross-tenant refs (`fee_type_id`, `student_id`, `run_id`) | Pay/another tenant's bill, read foreign records | Composite checks: `fee_types WHERE id AND tenant_id`; `students WHERE id AND tenant_id`; `guardians_link(parent_id, student_id)`; payroll ops tenant-scoped compare-and-set; 404/403 on mismatch, never distinguish beyond safe codes |
| T3 | Callback forgery (fake Daraja POST) | Fabricated payments | `x-callback-secret` fail-closed (`getPlatformConfig(['mpesa_callback_secret'])`, missing → 500, mismatch → 401 via constant-time `verifySecret`); POST-only (→ 405) |
| T4 | Callback replay / double-spend | Duplicate money records | Idempotent `reconcile_payment` on `(mpesa_checkout_id, tenant_id)` → `duplicate`; `completed` fast-path returns `already_reconciled`; deterministic `RCP-*` (§8); `finalize_payroll_b2c` idempotent |
| T5 | Amount/phone tampering in callback | Underpay, credit wrong payer | Exact amount compare vs `checkout_requests.amount`; digit-normalized phone compare; mismatch → mark `failed` + `409 amount_mismatch`/`phone_mismatch`; never trust provider amounts for new obligations |
| T6 | Waiver abuse (discount as theft) | Revenue leakage | `grant_waiver` RPC locks invoice `FOR UPDATE`, validates `invalid_amount/not_found/already_settled/exceeds_balance`, writes `waivers` + `audit_log waiver_granted`; marker ≠ approver (see §5) |
| T7 | Payroll SoD bypass (self-approve, re-push) | Ghost payouts | `payroll-ops` role split (generate/approve/mark-paid distinct); `payroll_runs.no_anon_write` (anon → false); `claim_payroll_run` atomic `approved → processing` + minted `b2c_checkout_id`; `b2c` service-role-only |
| T8 | SMS spoof / notification injection | Phishing parents, cost burn | `notify` service-role Bearer only, scheduler-invoked; `sms-campaign` restricted to admin/principal/bursar + `sms:{tenant}` 10/min bucket; sender from `tenants.sms_sender_id ?? 'ESHULE'`; idempotent `external_id` keys |
| T9 | Secret leak (browser bundle, logs, errors) | Provider account takeover | Secrets only via `resolve_credential`/`decrypt_tenant_credential` inside Edge; never to browser/logs/errors (§7); bearer/api-token redaction in `last_error` |
| T10 | Anon privilege escalation (direct `user_roles`/`payroll_runs` writes) | Role self-grant, state forgery | `user_roles` exposes `own_roles_read` (self-select) only — management stays service-role-side; `payroll_runs.no_anon_write` denies all anon; `tenants` self-read/update only; `role_permissions`/`permissions` not browser-writable |

## 3. OWASP Top 10 mapping

| OWASP (2021) | Concrete control in this stack |
|---|---|
| A01 Broken Access Control | RLS tenant policies + Edge re-checks; `ProtectedRoute` coarse, server fine-grained; IDOR composite FK checks; `verifyAdmin` for admin ops; deny-by-default anon payroll policy |
| A02 Cryptographic Failures | Supabase Auth session handling (no hand-rolled tokens); secrets encrypted at rest, decrypted only via `decrypt_tenant_credential` (KEK `reclass_kek` via `vault.decrypted_secrets`); TLS via platform; no secrets in bundle/logs |
| A03 Injection | No raw SQL string concat with untrusted values (PostgREST builders + bound RPC args); Zod/server-side validation on Edge inputs; CSV import allowlists; safe-error shape `{ error: CODE }` |
| A04 Insecure Design | SoD state machines (payroll `draft → approved → paid`, compare-and-set); idempotency keys; unmatched-payment queue instead of force-attribution; rate-limit buckets fail-closed |
| A05 Security Misconfiguration | RLS enabled on all tenant tables + `tenants` + `user_roles`; `service_role` only in Edge env; placeholder anon-key fallback warns, never ships service key; CORS via `handleOptions`; POST-only callbacks |
| A06 Vulnerable Components | Dependency/security scanning in CI; pinned Daraja/Mobiwave call shapes; `fetchWithRetry` bounded (3×, `500·2^attempt` ms) + 10 s abort on SMS send |
| A07 Auth Failures | Supabase Auth, invite-only onboarding; brute-force bucket `login:{ip}` 10/min; `verifyAuth` → 401 on null; logout clears session + tenant context (see §4) |
| A08 Data/Software Integrity Failures | Deterministic receipt/`external_id` minting; `reconcile_payment`/`finalize_payroll_b2c` idempotent RPCs; callbacks bind to stored checkout state, never provider-supplied tenant |
| A09 Logging/Monitoring Failures | Append-only audit with actor/tenant/before-after (§11); prefixed server logs (`[stk]`, `[b2c]`, `[mpesa-callback]`); `claim_notifications` attempts/`last_error` (redacted); unmatched-deposit alerts |
| A10 SSRF | No browser-supplied URLs fetched server-side; Daraja/Mobiwave bases are constants/env (`MOBIWAVE_BASE`), `CallBackURL` built from platform `public_url`, not request input |

## 4. Authentication

- **Supabase Auth only.** Browser client (`integrations/supabase/client.ts`):
  `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })`.
- **Invite-only onboarding.** No self-registration to staff roles; `user_roles`
  grants are created service-role-side. `ProtectedRoute` denies when no session
  or no held role (→ `/login`).
- **Session cookies.** Supabase persists/refreshes the session; auth storage is
  never hand-rolled. Every privileged Edge call sends
  `Authorization: Bearer <jwt>`; `verifyAuth()` returns `{ id, email? }` or null → `401 UNAUTHORIZED`.
- **Logout clears tenant context.** `AuthContext.logout()` =
  `supabase.auth.signOut()` + clear `eshule_active_role` + `qc.clear()` +
  invalidate `['tenant-context']` → `/login`. `switchRole(role, held)` guards
  `held.includes(role)` before persisting and navigating to `roleHome[role]`.
- **Anti-patterns blocked:** no `service_role` in the bundle, no role stored
  without a matching `user_roles` row, no tenant taken from localStorage alone —
  tenant always resolves from the authenticated grant.

## 5. Authorization (RBAC + SoD)

- **12 roles, 25 permission codes** (`lib/rbac.ts`, `PERMISSIONS`):
  `super_admin, school_admin, principal, teacher, remedial_teacher, bursar,
  payroll, reclass_chair, reclass_secretary, reclass_treasurer, reclass_member, parent`;
  `school.finance.{view,manage,approve,reconcile,report}`,
  `reclass.programme|teaching|attendance|committee.{view,manage}`,
  `reclass.finance.{view,manage,approve,reconcile,report}`,
  `reclass.payments.{view,manage}`, `reclass.reports.view`,
  `users.manage`, `settings.manage`, `audit.view`.
- **Two layers.** (a) Route-coarse: `ProtectedRoute({ allowedRoles,
  requiredPermissions })` — `effective = stored ?? held[0]`, must be in
  `allowedRoles`; permissions use `.some` (any-match) with `super_admin`
  bypass. **Client-side only.** (b) Server-fine: Edge/RPC re-check role +
  tenant + ownership on every mutation; `verifyAdmin()` gates admin ops to
  `school_admin/super_admin`.
- **Composite tenant FK is hard.** Loading a `fee_type`, `student`, `invoice`,
  or `payroll_run` without `AND tenant_id = grant.tenant_id` is a bug. Parent
  flows additionally require `guardians_link(parent_id, student_id)`.
- **SoD invariants (non-negotiable):**
  - Marker (attendance/teaching capture) ≠ approver (payroll `approve`).
    `payroll-ops`: `generate ∈ (school_admin, super_admin)`,
    `approve ∈ (school_admin, super_admin, principal)`,
    `mark-paid ∈ (school_admin, super_admin, bursar)` — no single non-admin
    principal covers generate + approve + pay.
  - Treasurer ≠ chairman: `RECLASS_FINANCE_ROLES =
    (reclass_treasurer, school_admin, super_admin, principal)`; committee
    management (`reclass.committee.manage`) and finance approval
    (`reclass.finance.approve`) must not collapse onto one committee actor.
  - Bursar owns school finance; ReClass owns programme ops; Payroll owns
    compensation; principal oversight confers no automatic bursar/payroll/
    operator rights; classroom vs remedial teacher type ≠ committee assignment.

## 6. RLS matrix + `service_role` rule

Migration: `20260909120000_react_spa_rls_hardening.sql` (idempotent replay).
Helper: `tenant_ids_for_user()` (`SECURITY DEFINER`, `stable`) =
`SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()`.

| Table(s) | `authenticated` | `anon` | Notes |
|---|---|---|---|
| All `tenant_id` tables (`students`, `parents`, `teachers`, enrollments/admissions/classes, `subjects`, `fee_types`, `invoices`, `payments`, `checkout_requests`, `receipts`, `payroll_runs`, attendance/sessions/occurrences, `notifications`, comms, `expenses`, `other_income`, `teacher_tasks`, calendar, discipline, lifecycle, `unmatched_payments`, `audit_log(s)`) | `tenant_read` (SELECT) + `tenant_write_staff` (ALL) scoped to `tenant_ids_for_user()` | no grant | Browser anon client gets nothing directly |
| `tenants` (keyed by `id`) | `tenant_self_read` (SELECT) + `tenant_self_update` (UPDATE) on `id IN (…)` | no grant | No cross-tenant update path |
| `payroll_runs` extra | same as above | `no_anon_write` (`USING false WITH CHECK false`) | Privileged transitions via Edge only |
| `user_roles` | `own_roles_read` (`user_id = auth.uid()`) | no grant | Role management stays service-role-side |

**`service_role` narrow-use rule:** `service_role` bypasses RLS, so each use
must be narrow, tenant-scoped in code, and auditable. Allowed: `stk`
(checkout insert, credential resolve), `mpesa-callback`/`b2c-result`
(reconcile/finalize), `notify` (`claim_notifications`), `payroll-ops`/`b2c`
state machines, `decrypt_tenant_credential`. Prefer user-scoped/RLS reads for
dashboards and tables; never proxy raw browser SQL through service-role.

## 7. Secrets

- **Resolve, then decrypt, server-side only:**
  `rpc resolve_credential(p_tenant, p_provider, p_allow_sandbox=false)` →
  active `credentials{scope:'tenant', purpose:'school_send'}` (production
  preferred; sandbox NULL unless explicitly allowed) →
  `rpc decrypt_tenant_credential(p_id, p_tenant)` (KEK `reclass_kek` via
  `vault.decrypted_secrets`; raises `credential_not_found (42501)` /
  `kek_missing`). ReClass M-Pesa uses the `resolve_reclass_mpesa_credential` /
  `decrypt_reclass_mpesa_credential` variants. Both RPCs are `service_role`-only.
- **Purpose separation is hard:** `school_send` = school operation;
  `platform_billing` = platform operations and **never a tenant fallback**.
  `stk` resolves per-domain channel (`tenants.school_payment_channel |
  remedial_payment_channel`); non-`mpesa` domains refuse STK (`400 BANK_CHANNEL`).
  SMS resolves `mobiwave_sms` per notification tenant.
- **Never to browser/logs:** no credential material in PostgREST responses,
  Edge success bodies, `last_error` (bearer/api-token redaction in `notify`),
  console output, test fixtures, screenshots, or issues. Daraja `Password`/
  OAuth `Basic` and Mobiwave `Bearer` are constructed in-memory per request.
- **Exposure response:** revoke/rotate at the provider + rotate KEK/row, audit
  the window — never just delete the commit.

## 8. Financial security

- **Idempotency everywhere** (`docs/api-react.md` §7): `checkout_requests`
  pre-insert UUID → overwrite with Daraja `CheckoutRequestID` (`UNIQUE` +
  partial-unique one-`pending` per student/fee; `23505` → `429
  DUPLICATE_REQUEST`); `payments.mpesa_checkout_id` unique →
  `reconcile_payment` returns `duplicate`; `notifications.external_id`
  (`mpesa-receipt:*`, `b2c-paid:*`) pre-checked + `23505` swallowed;
  `payroll_runs.b2c_checkout_id` unique-where-not-null; payroll status
  compare-and-set (`UPDATE … WHERE status = <from>`, zero-count → 409).
- **Concurrency-safe:** `grant_waiver` and `claim_payroll_run` /
  `claim_notifications` (`FOR UPDATE` / `FOR UPDATE SKIP LOCKED`) serialize
  competing callbacks/workers; `cleanup-pending-checkouts` janitors stale
  `pending` rows after 30 min so money can't hang in limbo.
- **Deterministic evidence:** `receipt_no =
  RCP-{TENANT6}-{YYYYMMDD}-{CHK5}` minted from stable inputs so retried
  callbacks can't mint a second receipt. Invoices = obligations, payments =
  transactions, receipts = evidence of actual payment; payroll runs =
  processing state, not proof of payout (only `finalize_payroll_b2c → paid` is).
- **Unmatched queue, not force-attribution:** manual paybill deposits without a
  checkout row route by `BillRefNumber = admission_no`; unknown refs park in
  `unmatched_payments{tenant_id, checkout_id, mpesa_receipt, amount, phone,
  bill_ref}` for the bursar queue. Missing refs return `missing_bill_ref`
  without writing money rows.
- **Void = reversal, never delete:** cancel a payment/waiver with a reversing
  entry + audit row; receipt numbers are never reused.

## 9. Callback security checklist (Daraja → Edge)

Applies to `mpesa-callback`, `b2c-result` (and `reclass-mpesa-callback` /
`reclass-stk` once the noted secret-gate gap is closed):

1. POST-only → `405` otherwise.
2. 10 KB cap on `content-length` **and** actual bytes
   (`TextEncoder().encode(raw).length`) → `400 body_too_large`.
3. `x-callback-secret` fail-closed: resolve via `getPlatformConfig`
   (explicit env wins, else DB `platform_config`); absent → `500`;
   constant-time `verifySecret` mismatch → `401`.
4. Required fields (`CheckoutRequestID`, `ResultCode` /
   `OriginatorConversationID`, receipt + amount on success) else
   `400 invalid_callback` / `INCOMPLETE_CALLBACK`.
5. Amount/phone binding against stored checkout (§2 T5); failures mark
   `failed` and return `409`.
6. Idempotent replay: same `CheckoutRequestID`/`OriginatorConversationID` →
   `200 already_reconciled|duplicate|paid`; deterministic receipt/`external_id`.
7. Bounded external calls (retry 3×, `500·2^attempt` ms; 10 s abort on SMS);
   safe `internalError` shape — no provider internals to the caller.

## 10. Application security

- **Validate server-side.** Browser Zod/forms are UX; Edge re-validates
  (`fee_type_id`/`student_id` UUIDs, phone `254[17]…`, `amount > 0`,
  `deleted_at IS NULL`, channel checks, role checks). CSV/import fields use
  allowlists.
- **No raw SQL concat** with untrusted values — PostgREST builders + bound RPC
  parameters only.
- **Secure headers/cookies:** Supabase-managed session; `service_role` key only
  in Edge env (`_shared/supabase.ts`); CORS preflight via `handleOptions`;
  no secrets in client bundles (anon key only + placeholder-warn fallback).
- **Safe errors** (`docs/api-react.md` §8): `{ error: CODE }` vocabulary —
  `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 *_NOT_FOUND`, `400
  INVALID_*|BANK_CHANNEL|CREDS_*|…`, `409/429 DUPLICATE|TRANSITION|amount_mismatch`,
  `5xx INTERNAL_ERROR`. Never return Postgres/Daraja internals, SQL, or secrets;
  log server-side with function prefixes.
- **Rate limits** (`docs/api-react.md` §9, enforced Edge-side via
  `rpc rate_limit_hit`, exceed → `429` + `Retry-After`): STK push 5/min/parent
  (+ pending-row guard), login 10/min/IP, SMS enqueue 10/min/tenant
  (`notify` `MAX_BATCH = 50`, `MAX_ATTEMPTS = 3`, backoff 1/5/30 min),
  CSV export 120/min/tenant, global 120/min/tenant.

## 11. Audit

- **Append-only.** Privileged mutations (waivers, payroll generate/approve/
  mark-paid, B2C claim/finalize, reconciliations, credential use, role changes,
  unmatched-payment resolution) insert audit rows; no UPDATE/DELETE path for
  ordinary roles.
- **Required fields:** actor (`user.id`), tenant (`tenant_id`), action, resource
  (type + id), timestamp, result, and before/after or approval context
  (e.g. `waiver_granted` with invoice balance before/after; payroll transitions
  with `b2c_checkout_id`/receipt).
- **Shared service:** audit is not owned by bursar/ReClass/payroll alone;
  `audit.view` gates read; cross-tenant audit reads are denied by RLS.
- **Noisy-neighbor rule:** audit write failure never blocks money safety —
  fail the user action closed but keep payment state consistent, then alert.

## 12. Operations security

- **Environment separation:** distinct Supabase projects/keys, Daraja
  shortcodes/passkeys, Mobiwave tokens, and `mpesa_callback_secret` per
  dev/staging/prod; production values only in the hosting secret store, never
  in repo, screenshots, or chat logs.
- **Least privilege:** Edge envs hold only the keys they need; DB grants are
  `service_role`-only for decrypt/claim/finalize RPCs; staff roles get minimum
  viable permissions (§5); scheduler invokes `notify`/`cleanup-pending-checkouts`
  with service-role, never a user token.
- **Backups & recovery:** PITR + verified restores and restore exercises before
  fee-season peaks; `dr-runbook.md` owns RTO/RPO; checkout/reconcile replay is
  part of the release gate.
- **Scanning & monitoring:** dependency/security scans in CI; alerting on
  callback 5xx spikes, `unmatched_payments` growth, `failed` notification
  backlogs, and payroll stuck in `processing`; Daraja/Mobiwave outage runbook
  with bounded retry + queue-drain procedure.
- **Incident ownership:** named owner + escalation path (bursar for money,
  platform on-call for infra); suspected secret exposure triggers
  revoke/rotate + audit-window review (§7).

## 13. Release blockers + reporting policy

Blockers (must be evidenced, not asserted):

1. Migration replay clean, including `20260909120000_react_spa_rls_hardening.sql`
   (policies present on every `tenant_id` table; anon payroll deny verified).
2. Cross-tenant negative tests green for students, guardians, teachers,
   sessions, attendance, invoices, payments, receipts, payroll, notifications,
   audit, and credentials.
3. Financial workflow tests green: STK happy path, amount/phone mismatch,
   replay → `duplicate`, manual-paybill → matched + `unmatched_admission`,
   waiver guards, payroll SoD + compare-and-set races, void-as-reversal.
4. Callback gate tests green: non-POST → 405, oversize → 400, missing secret →
   500, wrong secret → 401, unknown checkout → safe 404/`not_found`.
5. Secret scan + bundle scan: no `service_role`, KEK, passkey, or tokens in
   `apps/web-react` output, logs, or fixtures; `last_error` redaction verified.
6. Backup/restore drill + rate-limit + CSV-cap (5000 rows) verification recorded.

**Reporting:** do not file exploitable tenant-isolation, credential, personal-data,
or payment issues in public trackers. Report privately with a minimal
reproduction using **synthetic non-production data**; never probe another
tenant's data or production systems without explicit authorization.
