# eShule React SPA — API Design (`apps/web-react` + Supabase)

> Scope: React Vite SPA (`apps/web-react/src`) talking to Supabase directly.
> No public `/v1` REST contract exists (see `API.md` §1, §9). Browser calls
> PostgREST / `rpc()` with the anon key; privileged work goes through Edge
> Functions below. Keep examples synthetic — no real credentials, receipts, or PII.

## 1. Interface types

| Channel | Used for | Source of truth |
|---|---|---|
| PostgREST direct (`supabase.from(<table>).select/insert/update`) | dashboards, tables, lookups (`useStudents`, `useFinance`, `useRemedial`, `useDashboard`) | RLS + `tenant_id` scoping in each query |
| Supabase RPC (`supabase.rpc(<fn>, {...})`) | atomic writes the browser must never do by hand (waivers, claims, credential checks) | `SECURITY DEFINER`, `service_role`-only grants (see §5) |
| Edge Functions (`POST /functions/v1/<name>`) | Daraja M-Pesa, Mobiwave SMS, payroll state machine, CSV export, scheduled cleanup | `supabase/functions/<name>/index.ts` + `_shared/*` |

There is no versioned public API. Do not treat generated PostgREST CRUD as stable
for third parties. If third-party access is ever introduced, version it (`/v1`)
with auth, tenant scoping, rate limits, idempotency, and deprecation policy first.

## 2. Auth

- Browser client is **anon-key only** (`integrations/supabase/client.ts`):
  `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })`.
  Never ships `service_role`; never throws at import time (placeholder fallback + warn).
- Every privileged call sends `Authorization: Bearer <supabase-auth-jwt>`.
  Edge verifies via `verifyAuth()` (`_shared/auth.ts`): `getUserClient(token).auth.getUser()`,
  returns `{ id, email? }` or `null` → `401 UNAUTHORIZED`.
- `service_role` exists **only inside Edge Functions** (`_shared/supabase.ts`
  `getServiceClient()` reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from env).
  `verifyAdmin()` additionally checks `user_roles.role IN (school_admin, super_admin)`.
- `AuthContext.tsx` is thin: `logout()` (`supabase.auth.signOut()`, clear
  `eshule_active_role`, `qc.clear()`, → `/login`) and
  `switchRole(role, held)` (guard `held.includes(role)`, persist, invalidate
  `['tenant-context']`, navigate to `roleHome[role]`).
- `ProtectedRoute.tsx` gate (client-side only — server must re-check):
  `getSession()` → load `user_roles.role` → `effective = stored ?? held[0]` →
  `allowedRoles.includes(effective)` else → `/login`; if `requiredPermissions`
  non-empty, resolve `role_permissions → permissions.code` and require
  `super_admin` **or** any match (`.some`, not `.every`).

## 3. RBAC matrix (`lib/rbac.ts`)

Roles (12): `super_admin, school_admin, principal, teacher, remedial_teacher,
bursar, payroll, reclass_chair, reclass_secretary, reclass_treasurer,
reclass_member, parent`.

Route groups:

| Group | Roles |
|---|---|
| `ADMIN_ROLES` | `school_admin, super_admin, principal, bursar` |
| `MEMBER_MANAGEMENT_ROLES` | `school_admin, super_admin, principal` |
| `FINANCE_ROLES` | `school_admin, super_admin, bursar, payroll` |
| `COMPLIANCE_ROLES` | `school_admin, super_admin, principal` |
| `REPORTS_ROLES` | `school_admin, super_admin, principal, bursar, payroll` |
| `SETTINGS_ROLES` / `USER_MANAGEMENT_ROLES` | `school_admin, super_admin` |
| `TRANSACTION_VIEW_ROLES` | `school_admin, super_admin, bursar, principal` |
| `TEACHER_ROLES` | `teacher, remedial_teacher, school_admin, super_admin, principal` |
| `PARENT_ROLES` | `parent` |
| `RECLASS_ROLES` / `RECLASS_COMMITTEE_ROLES` | chair/secretary/treasurer/member + `remedial_teacher` (roles only) / + `school_admin, super_admin, principal` |
| `RECLASS_FINANCE_ROLES` | `reclass_treasurer, school_admin, super_admin, principal` |
| `SUPER_ADMIN_ROLES` | `super_admin` |

Permission codes (`PERMISSIONS`): `school.finance.{view,manage,approve,reconcile,report}`,
`reclass.programme.{view,manage}`, `reclass.teaching.{view,manage}`,
`reclass.attendance.{view,manage}`, `reclass.committee.{view,manage}`,
`reclass.finance.{view,manage,approve,reconcile,report}`,
`reclass.payments.{view,manage}`, `reclass.reports.view`,
`users.manage`, `settings.manage`, `audit.view`.
Enforced on ReClass routes today, e.g. `/reclass` + `reclassProgramme.view`,
`/admin/attendance` + `reclassAttendance.view`, `/admin/committee` +
`reclassCommittee.view`, `/admin/fee|remedial-fees|payroll` + `reclassFinance.view`,
`/admin/parent-payments|remedial/receipts` + `reclassPayments.view`,
`/admin/scheduling` + `reclassTeaching.view`.

## 4. Edge Function contracts

Base: `POST {SUPABASE_URL}/functions/v1/<name>`. CORS preflight (`OPTIONS`) → `200 ok`
via `handleOptions`. Error shape is `{ error: CODE }` (`_shared/response.ts`).

### `stk` — parent STK push (school / remedial fees)

- Auth: user Bearer JWT. Resolves `parents WHERE profile_id = user.id` → `{ id, tenant_id, phone }`.
- `POST /functions/v1/stk`
- Request: `{ "fee_type_id": "uuid", "student_id": "uuid" }`
- Flow: verify `guardians_link(parent_id, student_id)`; load `fee_types{id,tenant_id,name,amount,domain}`
  (`deleted_at IS NULL`); domain = `school|remedial`; refuse unless tenant channel for that
  domain is `mpesa` (`tenants.school_payment_channel|remedial_payment_channel`) → `400 BANK_CHANNEL`;
  `AccountReference = students.admission_no.slice(0,12)`; reject when a `pending`
  `checkout_requests` row exists for `(fee_type_id, student_id)` → `429 DUPLICATE_REQUEST`;
  normalize phone → `2547|2541…` (`/^254[17]\d{8}$/`), `amount > 0`; `resolve_credential(tenant,'mpesa',false)` →
  `decrypt_tenant_credential`; Daraja OAuth (`/oauth/v1/generate`), `CallBackURL =
  {public_url}/functions/v1/mpesa-callback`; pre-insert `checkout_requests{tenant_id,fee_type_id,
  student_id,checkout_id:uuid,amount,phone,status:'pending'}` (partial-unique race → `429`);
  on accept `UPDATE checkout_id = CheckoutRequestID`.
- Response `200`: Daraja body `{ ResponseCode, ResponseDescription, CheckoutRequestID,
  CustomerMessage?, metrics:{ duration, successRate, darajaFailures } }`.
- Errors: `401 UNAUTHORIZED` · `403` (no parent row / no guardian link) ·
  `404 FEE_TYPE_NOT_FOUND|STUDENT_NOT_FOUND` · `400 INVALID_REQUEST|INVALID_PAYMENT_DETAILS|
  BANK_CHANNEL|CREDS_NOT_FOUND` · `429 DUPLICATE_REQUEST` · `500 INTERNAL_ERROR`.

### `mpesa-callback` (+ `reclass-mpesa-callback`)

- `POST /functions/v1/mpesa-callback` — Daraja server → server. **No user JWT.**
  Callback security (§10) applies. Non-POST → `405 method_not_allowed`.
- Request (Daraja): `{ Body: { stkCallback: { CheckoutRequestID, ResultCode, ResultDesc,
  CallbackMetadata: { Item: [{ Name, Value }] } } } }`.
  Extracted: `Amount`, `PhoneNumber`, `BillRefNumber` (= `admission_no`), `MpesaReceiptNumber`.
- Fast path (checkout row found): `completed` → `200 { status:'already_reconciled' }`;
  amount mismatch or phone-digit mismatch → mark `failed`, `409 { status:'amount_mismatch'|
  'phone_mismatch' }`; else `rpc reconcile_payment(p_checkout_id,p_amount,p_phone,
  p_tenant_id,p_student_id,p_fee_type_id,p_domain)` (domain from checkout's `fee_types.domain`).
  Non-`completed|duplicate` → `409`. On success stamp `payments{student_id,fee_type_id,domain,
  receipt_no}` and `checkout_requests.status='completed'`, enqueue receipt SMS.
- Manual paybill path (no checkout row): route by `BillRefNumber → students.admission_no`;
  infer `fee_types WHERE amount` for domain; same `reconcile_payment`. Unknown admission →
  `unmatched_payments{tenant_id,checkout_id,mpesa_receipt,amount,phone,bill_ref}` +
  `200 { status:'unmatched_admission' }`; missing ref → `200 { status:'missing_bill_ref' }`.
  `ResultCode != 0` → `checkout_requests.status='failed'` + `200 { status:'failed' }`.
- `POST /functions/v1/reclass-mpesa-callback` — same POST-only shape for the ReClass ledger:
  looks up `reclass_paybill_transactions WHERE checkout_id`; `code != 0` →
  `rpc fail_reclass_paybill_transaction(p_transaction_id,p_reason)` → `200 { ok:true,status:'failed' }`;
  success requires `MpesaReceiptNumber:string` + `Amount:number` else `400 INCOMPLETE_CALLBACK`;
  then `rpc reconcile_reclass_paybill_transaction(p_transaction_id,p_checkout_id,
  p_mpesa_receipt,p_amount,p_phone,p_student_id,p_obligation_id)` → `200 { ok:true,status,transaction }`;
  unknown checkout → `404 TRANSACTION_NOT_FOUND`. (Note: this handler currently lacks the
  `x-callback-secret` gate — add before production exposure.)

### `notify` — SMS/in-app delivery worker

- Auth: **service-role Bearer only** (`SUPABASE_SERVICE_ROLE_KEY` exact match or JWT
  `role == service_role && iss == supabase`) → else `401`. Invoked by scheduler/cron, never the browser.
- `POST /functions/v1/notify` (body ignored). Claims `rpc claim_notifications(p_limit)` with
  `limit = min(50, 100)` (`MAX_BATCH = 50`).
- Per item: `inapp` → `sent` (inbox reads live); non-`sms` → `failed: unsupported_channel`;
  `sms` → sender `tenants.sms_sender_id ?? 'ESHULE'`; `resolve_credential(tenant,'mobiwave_sms',false)` →
  `decrypt_tenant_credential` → `POST {MOBIWAVE_BASE}/sms/send { recipient, sender_id, type:'plain', message }`
  (10 s abort). Success → `sent` (+ `external_id = uid|message_id`, `sent_at`); fail →
  `queued` with `backoff = 1|5|30 min`, `failed` after `MAX_ATTEMPTS = 3`. Secrets redacted in `last_error`.
- Response `200`: `{ processed, sent, failed }`.

### `sms-campaign` — staff bulk SMS enqueue

- Auth: user JWT; requires `user_roles.role ∈ (school_admin, super_admin, principal, bursar)`;
  tenant = first staff grant's `tenant_id`. Else `401/403`.
- `POST /functions/v1/sms-campaign`
- `{ "op": "balance" }` → `GET {MOBIWAVE_BASE}/balance` → `200 { balance }`.
- `{ "contact_list_id", "message" }` → `POST {MOBIWAVE_BASE}/sms/campaign
  { contact_list_id, sender_id, type:'plain', message }` → `200 { campaign }`.
- `{ "recipients": ["0712…"], "message", "trigger"? }` → normalize each to `254…`,
  insert `notifications{tenant_id,channel:'sms',recipient,body:message,template:trigger ??
  'manual_custom',status:'queued',attempts:0}` → `200 { queued: n }`.
- Errors: `400 INVALID_JSON|MESSAGE_REQUIRED|RECIPIENTS_REQUIRED|CREDS_NOT_FOUND` ·
  `500 ENQUEUE_FAILED`. Delivery itself is done later by `notify`.

### `b2c` / `b2c-result` — remedial payroll payout

- `POST /functions/v1/b2c` — service-role Bearer only (same gate as `notify`).
  Request: `{ "tenant_id": "uuid", "run_id": "uuid", "actor_id"?: "uuid" }`.
- `rpc claim_payroll_run(p_tenant_id,p_run_id,p_profile_id)` atomically flips
  `approved → processing` and mints idempotent `b2c_checkout_id`. Already claimed/missing →
  `404|409 { status, message }` (no re-push). Pre-flights (each `finalize_payroll_b2c(…,1,reason)`
  before returning): `amount > 0` → `400 INVALID_AMOUNT`; teacher phone `254[71]…` →
  `400 TEACHER_PHONE_REQUIRED`; `id_number` present → `400 TEACHER_ID_REQUIRED`;
  `resolve_credential/decrypt` mpesa → `400 CREDS_NOT_FOUND|CREDS_INVALID`;
  `initiator_name + security_credential` present → `400 B2C_CREEDS_REQUIRED`;
  `shortcode` (PartyA) → `400 SHORTCODE_REQUIRED`; Daraja OAuth → `401 DARAJAAUTH_FAILED`;
  `public_url` set → `400 PUBLIC_URL_REQUIRED`.
- Daraja `POST /mpesa/b2c/v1/paymentrequest { InitiatorName, SecurityCredential,
  CommandID:'BusinessPayment', Amount, PartyA:shortcode, PartyB:phone, Remarks,
  QueueTimeOutURL = ResultURL = {public_url}/functions/v1/b2c-result, Occasion }`.
  Reject → `409 { status:'rejected' }`; accept → `200 { status:'processing', run_id, phone, amount }`.
- `POST /functions/v1/b2c-result` — Daraja ResultURL/QueueTimeOutURL. POST-only, `x-callback-secret`
  fail-closed, 10 KB cap (same as `mpesa-callback`). Reads `Result.{OriginatorConversationID
  (= b2c_checkout_id), ResultCode, ResultDesc, ResultParameters[]}` (`TransactionReceipt`).
  Unknown run → `200 { status:'not_found' }`; else
  `rpc finalize_payroll_b2c(p_tenant_id,p_b2c_checkout_id,p_result_code,p_result_desc,p_receipt?)`
  (idempotent) → `200 { status }`; on `paid`, enqueue teacher SMS (`sms_teacher_payout` toggle,
  `external_id = b2c-paid:{run_id}`).

### `payroll-ops` — generate / approve / mark-paid

- Auth: user JWT, role by op: `generate ∈ (school_admin, super_admin)`,
  `approve ∈ (school_admin, super_admin, principal)`, `mark-paid ∈ (school_admin, super_admin, bursar)`.
  Tenant from the matching `user_roles` grant.
- `POST /functions/v1/payroll-ops`
  `{ "op":"generate", "kind":"school", "period_start":"YYYY-MM-DD", "period_end":"YYYY-MM-DD" }` →
  salaried `teachers{salary_monthly > 0}` → `upsert payroll_runs` on
  `(tenant_id,teacher_id,period_start,period_end,domain)` → `200 { success,count,totalAmount }`.
- `{ "op":"generate", "kind":"remedial", … }` → requires `tenants.payroll_rate_per_session > 0`
  (`400 RATE_NOT_SET`); per-teacher `remedial_rate_per_session` else tenant fallback;
  counts via `rpc aggregate_payroll_counts(p_tenant_id,p_period_start,p_period_end)`;
  `amount = occurrences_count × rate`; empty → `400 NO_ATTENDANCE`.
- `{ "op":"approve"|"mark-paid", "kind":…, "id":"run-uuid" }` — compare-and-set
  `draft → approved` / `approved → paid (paid_at=now())`, tenant-scoped:
  `200 { success:true }`; wrong state → `400 INVALID_TRANSITION`; lost race → `409 TRANSITION_FAILED`;
  unknown → `404 NOT_FOUND`.
- Errors: `400 OP_KIND_REQUIRED|ID_REQUIRED|PERIOD_REQUIRED|PERIOD_ORDER|NO_SALARIED_TEACHERS|
  RATE_NOT_SET|NO_ATTENDANCE` · `409 GENERATE_FAILED` (unique-violation path).

### `reports-csv` — CSV exports

- Auth: user JWT, `role ∈ (school_admin, super_admin, principal, bursar)`; tenant from grant.
- `POST /functions/v1/reports-csv` `{ "report": "revenue|students|subjects|teachers|teacher-attendance" }`
  → `text/csv` download, hard cap `EXPORT_MAX_ROWS = 5000`, newest-first where dated.
  Columns: revenue = `Student, Admission No, Grade, Fee, Amount (KES:2dp), Channel
  (M-Pesa for remedial), Reference (bank_reference|mpesa_receipt), Receipt No, Created At (ISO)`;
  students = `Admission No, First Name, Last Name, Grade, Status` (excludes soft-deleted);
  subjects = `Name, Code`; teachers = `First Name, Last Name, Phone, Type` (excludes soft-deleted);
  teacher-attendance = `Teacher, Status, Date`. Unknown → `400 UNKNOWN_REPORT`.

### `cleanup-pending-checkouts` — scheduled janitor

- `POST /functions/v1/cleanup-pending-checkouts` (scheduler; non-POST → `405`).
- Marks `checkout_requests WHERE status='pending' AND created_at < now()-30min`
  (batch 100) → `{ status:'failed', reason:'TIMEOUT - …', updated_at:now() }`.
- Response `200`: `{ success:true, timestamp, cleaned, failed, errors:[] }`.

## 5. RPC contracts (browser calls `rpc()` only where granted; most are `service_role`-only)

| Function | Signature | Returns / notes |
|---|---|---|
| `reconcile_payment` (v3) | `(p_checkout_id text, p_amount numeric, p_phone text, p_tenant_id uuid, p_student_id uuid = NULL, p_fee_type_id uuid = NULL, p_domain text = 'remedial')` | `{ status:'completed',payment_id }` or `{ status:'duplicate',payment_id }`; `invalid_amount` on `amount<=0`. Idempotent on `(mpesa_checkout_id, tenant_id)`; backfills student/fee/domain. `service_role` only. |
| `grant_waiver` | `(p_invoice_id uuid, p_amount numeric, p_reason text, p_granted_by uuid, p_tenant_id uuid)` | Locks invoice (`FOR UPDATE`); `invalid_amount / not_found / already_settled / exceeds_balance`, else inserts `waivers`, bumps `invoices.amount_paid`, flips to `waived` at full cover + `audit_log waiver_granted`. |
| `resolve_credential` | `(p_tenant uuid, p_provider text, p_allow_sandbox bool = false)` → `uuid\|NULL` | Active `credentials{scope:'tenant',purpose:'school_send'}` for provider (`mpesa`, `mobiwave_sms`); production preferred; sandbox returns NULL unless allowed. `service_role` only. |
| `decrypt_tenant_credential` | `(p_id uuid, p_tenant uuid)` → `jsonb` | Tenant-bound decrypt (KEK `reclass_kek` via `vault.decrypted_secrets`); raises `credential_not_found (42501)` / `kek_missing`. Never returns material to the browser. `service_role` only. Also ReClass variants `resolve_reclass_mpesa_credential(p_allow_sandbox)` / `decrypt_reclass_mpesa_credential(p_id)`. |
| `claim_notifications` | `(p_limit int = 50)` → `TABLE(id,tenant_id,channel,recipient,body,attempts)` | Atomic claim (`queued→processing`, stale `processing` reclaim after 5 min, `FOR UPDATE SKIP LOCKED`, clamped 1–100, `attempts < 3`). `service_role` only. |
| `tenant_setting_enabled` | `(p_tenant uuid, p_key text)` → `boolean` | Reads `tenants.settings->>key`; **defaults TRUE** when missing (matches UI `?? true`). Keys: `sms_attendance, sms_payment_reminder, sms_payment_receipt, sms_teacher_payout, sms_provision_parent`. `service_role` only. |
| `enqueue_teacher_task_reminders` | `()` → `int` | pg_cron every 10 min; inserts `notifications{related_type:'teacher_task', channel:'in_app', external_id:'teacher-task-reminder:{task_id}'}` for due open tasks + stamps `reminder_sent_at`. `ON CONFLICT DO NOTHING`. |

Payroll/B2C helpers: `claim_payroll_run(p_tenant_id,p_run_id,p_profile_id)` (approved→processing +
mint `b2c_checkout_id`), `finalize_payroll_b2c(p_tenant_id,p_b2c_checkout_id,p_result_code,
p_result_desc,p_receipt?)` (idempotent paid/failed), `aggregate_payroll_counts(p_tenant_id,
p_period_start,p_period_end)` (attendance counts); ReClass: `initiate_parent_reclass_payment
(p_obligation_id,p_amount,p_phone)`, `submit_parent_reclass_stk(p_transaction_id,p_checkout_id)`,
`fail_reclass_paybill_transaction(p_transaction_id,p_reason)`,
`reconcile_reclass_paybill_transaction(…)` — all ownership-checked server-side.

## 6. Pagination / filtering

- PostgREST defaults cap at **1000 rows** — never rely on an unbounded `.select()`.
  Hot tables (`payments`, `students`, `teacher_attendance`, `notifications`, `payroll_runs`)
  always set an explicit bound: keyset first (`.order('created_at',{ascending:false})` +
  `.lt('created_at', cursor)` + `.limit(n)`), else `.range(from,to)` (`useStudents.ts`
  `range((page-1)*pageSize, page*pageSize-1)`), and always `.eq('tenant_id', ctx.tenantId)`
  + `.is('deleted_at', null)` where the table is soft-deleted.
- Current page sizes in code (keep or tighten): sessions 10, occurrences 20–30,
  attendance feed 50, committee profile lookup 500, generic admin tables 100, user_roles 200.
- CSV export is the escape hatch for bulk reads: `reports-csv` caps at **5000 rows**,
  newest-first — not a substitute for paged UI reads.

## 7. Idempotency

| Key | Shape | Enforced by |
|---|---|---|
| `checkout_requests.checkout_id` | UUID pre-insert → overwritten with Daraja `CheckoutRequestID` | `UNIQUE` + partial unique (one `pending` per student/fee); `23505` → `429 DUPLICATE_REQUEST` |
| `payments.mpesa_checkout_id` + `receipt_no` | `receipt_no = RCP-{TENANT6}-{YYYYMMDD}-{CHK5}` (deterministic from checkout) | `UNIQUE(mpesa_checkout_id)`; `reconcile_payment` returns `duplicate` on retry; `payments_receipt_no_key` unique where not null |
| `notifications.external_id` | `mpesa-receipt:{payment|checkout-id}`, `b2c-paid:{run_id}`, `parent-login:{id}:{day}`, `payment-reminder:{student}:{day}`, `session-reminder:{id}`, `teacher-task-reminder:{task_id}` | pre-insert existence check + `23505` swallowed; `ON CONFLICT DO NOTHING` in task-reminder RPC |
| `payroll_runs.b2c_checkout_id` | minted inside `claim_payroll_run` | `UNIQUE WHERE NOT NULL`; `finalize_payroll_b2c` idempotent; `payroll_runs` upsert on `(tenant_id,teacher_id,period_start,period_end,domain)` |
| `payroll status machine` | `draft → approved → paid` (plus `processing` for B2C) | compare-and-set `UPDATE … WHERE status = <from>`; `count == 0` → `409` |

## 8. Error vocabulary + safe errors

| Condition | Status | Codes seen in code |
|---|---|---|
| Unauthenticated | 401 | `UNAUTHORIZED`, `unauthorized` (b2c), `DARAJAAUTH_FAILED` |
| Unauthorized | 403 | `FORBIDDEN` (Edge `forbidden()`) |
| Not found / hidden by ownership | 404 | `NOT_FOUND`, `FEE_TYPE_NOT_FOUND`, `STUDENT_NOT_FOUND`, `TRANSACTION_NOT_FOUND` |
| Validation | 400/422 | `INVALID_REQUEST|INVALID_JSON|INVALID_PAYMENT_DETAILS|BANK_CHANNEL|CREDS_NOT_FOUND|CREDS_INVALID|B2C_CREEDS_REQUIRED|TEACHER_PHONE_REQUIRED|TEACHER_ID_REQUIRED|INVALID_AMOUNT|SHORTCODE_REQUIRED|OP_KIND_REQUIRED|PERIOD_REQUIRED|PERIOD_ORDER|MESSAGE_REQUIRED|RECIPIENTS_REQUIRED|UNKNOWN_REPORT|INVALID_CALLBACK|INCOMPLETE_CALLBACK|STK_REJECTED|PAYMENT_NOT_ALLOWED` |
| Conflict / replay | 409/429 | `DUPLICATE_REQUEST` (429), `TRANSITION_FAILED|INVALID_TRANSITION|GENERATE_FAILED` (23505→409), callback `amount_mismatch|phone_mismatch`, `already_reconciled|duplicate` |
| Provider unavailable | 502/503 | Daraja/Mobiwave non-JSON or transport failure → retry (3×, `500·2^attempt` ms) then `500` + `failed` row with `next_retry_at` |
| Unexpected failure | 500 | `INTERNAL_ERROR`, `ENQUEUE_FAILED`, `COUNT_FAILED` |

Rules: shape is `{ error: CODE }` (callbacks use lowercase `method_not_allowed|missing_originator|
body_too_large|invalid_callback`); never leak Supabase/Postgres/Daraja secrets or raw SQL —
redact bearer/api tokens in `last_error` (see `notify`); log server-side with `[stk]|[b2c]|
[mpesa-callback]` prefixes.

## 9. Rate limiting

Policy for the React SPA surface (enforced Edge/server-side, fail-closed on `login/stk/sms`):

| Bucket | Limit | Key |
|---|---|---|
| STK push | **5/min per parent** | `stk:{tenant}:{parent_id}` — plus the in-code `pending`-row + partial-unique guard returning `429 DUPLICATE_REQUEST` |
| Login | **10/min per IP** | `login:{ip}` |
| SMS enqueue | **10/min per tenant** | `sms:{tenant}`; delivery additionally capped by `notify` `MAX_BATCH = 50` per run, `MAX_ATTEMPTS = 3`, backoff 1/5/30 min |
| CSV export | 120/min per tenant | `csv:{tenant}:{user}` |
| Global | 120/min per tenant | `global:{tenant}` |

Backing store is Postgres `rate_limits(bucket_key, count, reset_at)` via
`rpc rate_limit_hit(p_key, p_max, p_window)` (service-role only); exceed → `429` with
`Retry-After`. (Legacy Svelte values were `login 5/min, stk 3/min` — the React contract
above is the authoritative tightening/relaxation; update this doc if buckets change.)

## 10. Callback security (Daraja → Edge)

1. **POST only** — any other method → `405` (`mpesa-callback`, `b2c-result`, `reclass-stk`,
   `cleanup-pending-checkouts` all reject non-POST).
2. **10 KB cap** — `MAX_BODY_BYTES = 10_240` enforced on `content-length` **and** actual
   byte length (`new TextEncoder().encode(raw).length`) so chunked bodies can't bypass; over →
   `400 body_too_large`.
3. **`x-callback-secret` fail-closed** — resolved via `getPlatformConfig(['mpesa_callback_secret'])`
   (explicit env wins, else DB `platform_config` via `rpc get_platform_config`); missing secret →
   `500` (no unauthenticated processing); mismatch via constant-time `verifySecret`
   (SHA-256 digest compare, `auth.ts`) → `401`.
4. **Amount/phone binding** — STK fast path compares callback `Amount` to `checkout_requests.amount`
   exactly and digit-normalized `PhoneNumber` to the checkout phone; mismatch → mark `failed` +
   `409`. Manual deposits bind via `BillRefNumber = admission_no`; unresolvable money is parked in
   `unmatched_payments` (bursar queue), never force-attributed.
5. **Retry-safe** — Daraja retries the same `CheckoutRequestID`/`OriginatorConversationID`;
   handlers return `200 already_reconciled|duplicate|paid` on replays and mint deterministic
   `receipt_no` / `external_id` so replays can't create second money records.
