# ReClass Implemented HTTP and Action Surface

> Current-state note (2026-08-01): [AUDIT-2026-08.md](AUDIT-2026-08.md) is the current readiness assessment. This file remains the detailed route/action inventory.

**Implementation audit date:** 2026-07-22  
**Scope:** current repository implementation only  
**Frameworks:** SvelteKit 2, Supabase Auth/PostgREST, Supabase Edge Functions

## Status and terminology

This is an implementation audit, not a proposed API contract. It documents code present on the audit date.

ReClass does **not** currently implement the versioned public REST API described in `docs/api.md`. Most application mutations are SvelteKit named form actions intended for the first-party browser UI. A named action is invoked with `POST /path?/actionName` using `FormData`; SvelteKit serializes action results and failures for form enhancement. These actions are not stable JSON REST resources, have no `/v1` prefix, and should not be presented to third-party consumers as a public API.

There are three distinct HTTP surfaces:

1. SvelteKit route handlers in `src/routes/**/+server.ts`.
2. SvelteKit page actions in `src/routes/**/+page.server.ts`.
3. Supabase Edge Functions under `supabase/functions/*/index.ts`, normally deployed at `<SUPABASE_URL>/functions/v1/<function-name>`.

Supabase also exposes PostgREST for the `public` and `graphql_public` schemas (`supabase/config.toml:7-18`). That generated surface is not enumerated here as a ReClass-authored endpoint set. Its safety depends on grants and RLS in the deployed database. The SvelteKit server normally calls PostgREST/RPC through a service-role Supabase client which bypasses RLS (`src/lib/supabase/server.ts:21-25`).

## Common SvelteKit behavior

### Authentication and routing

- Supabase SSR cookies are read by `getServerSupabase`; `locals.supabase.auth.getUser()` verifies the current user on every request (`src/lib/supabase/server.ts:8-18`, `src/lib/server/middleware.ts:38-72`).
- The first `user_roles` row ordered by `created_at` supplies the effective role and tenant. Multiple roles are not selectable (`src/lib/server/middleware.ts:61-71`).
- Unauthenticated users are redirected with `303` to `/login`; users without a recognized role are also redirected to `/login` (`src/lib/server/middleware.ts:102-136`).
- Role prefixes are enforced by `routeGuard`: `/admin`, `/principal`, `/teacher`, `/bursar`, `/parent`, and `/super-admin` map to their respective role. A super administrator may access `/admin` only while impersonating a tenant (`src/lib/auth.ts:12-19`, `src/lib/server/middleware.ts:128-135`).
- Role layouts add explicit checks for each role (`src/routes/(app)/*/+layout.server.ts`). Actions which do not call `requireTenantRole` directly still rely on these hooks/layouts.
- The server initializes `locals.srv` with the Supabase service-role key for every request. Every query using it bypasses RLS, so correctness depends on explicit role, tenant, and ownership predicates (`src/lib/server/middleware.ts:27-36`, `src/lib/supabase/server.ts:21-25`).

### Responses and errors

- Page actions return plain objects such as `{ success: true, message? }` or `fail(status, data)`. SvelteKit controls the wire serialization. There is no common response envelope.
- `error(status, message)` produces SvelteKit error handling; redirects are `303`.
- Validation failures are usually `400`, not `422`, and use inconsistent keys: `error`, `errors`, or `message`.
- Several database failures include `error.message` in action output. Others replace it with a generic message. There is no common error-code registry.
- `src/hooks.server.ts:19` delegates unhandled server errors to Sentry when configured.
- All SvelteKit responses receive `X-Request-Id`, `X-Content-Type-Options`, HSTS, `X-Frame-Options`, and `Referrer-Policy` through middleware (`src/lib/server/middleware.ts:85-99`).

### SvelteKit CSRF model

The repository does not configure a custom CSRF token. It relies on SvelteKit's default same-origin form-action behavior and SameSite auth cookies. No double-submit token described by `docs/security.md` is implemented. Direct endpoints do not add endpoint-specific CSRF logic.

## Direct SvelteKit endpoints

### `GET /api/healthz`

**Source:** `src/routes/api/healthz/+server.ts`  
**Effective access:** authenticated user with any recognized role. Despite its health-check name, it is not in `PUBLIC_ROUTES`, so unauthenticated requests are redirected to `/login` by the global hook.  
**Request:** no body or query parameters.  
**Success:** `200 application/json`:

```json
{
  "status": "ok",
  "uptime": 123.45,
  "authenticated": true,
  "timestamp": "2026-07-22T00:00:00.000Z"
}
```

It calls Supabase Auth again to determine `authenticated`. There is no dependency/readiness check for the database beyond Auth, no timeout, and no cache control. Errors are unhandled and go through SvelteKit/Sentry.

### `GET /api/logout`

**Source:** `src/routes/api/logout/+server.ts`  
**Effective access:** public route (`src/lib/config.ts:20-22`).  
**Behavior:** signs out through Supabase, deletes `x-reclass-user` and `x-reclass-impersonate`, then redirects `303` to `/login`.  
**Errors:** sign-out errors are ignored.  
**Security note:** logout changes session state through `GET`; cross-site navigation can force logout.

### `POST /parent/messages`

**Source:** `src/routes/(app)/parent/messages/+server.ts`  
**Effective access:** authenticated `parent` with a linked parent profile (`getParentOwnership`, `src/lib/server/ownership.ts:9-28`).  
**Content type:** JSON.  
**Request:** `{ "teacher_id"?: string, "conversation_id"?: string, "body": string }`.

- `body` must be truthy after `trim()`.
- If `conversation_id` is absent, `teacher_id` is required and a random conversation UUID is generated.
- The insert fixes `tenant_id`, `sender_id`, and `sender_role: "parent"` from authenticated context.
- Neither `teacher_id` nor a supplied `conversation_id` is checked for membership/participation. The implementation writes `teacher_id` to `messages.recipient_id`, although the schema expects a profile ID (`supabase/migrations/20260722000006_create_messages.sql:5-8`).

**Success:** `200` with raw JSON text `{ "ok": true }`.  
**Errors:** `400 { "error": "Message body required" }`, `400 { "error": "Teacher or conversation required" }`, or `500 { "error": "<database message>" }`. Responses do not explicitly set `Content-Type: application/json`. Malformed JSON becomes an unhandled server error.

### CSV downloads

All CSV handlers use `csvResponse`, which quotes every value and doubles embedded quotes (`src/lib/server/csv.ts`). They return `text/csv; charset=utf-8` with `Content-Disposition: attachment`. They do not neutralize spreadsheet formula prefixes (`=`, `+`, `-`, `@`). No endpoint accepts filters, sort, cursor, or page parameters.

Each handler uses the process-local `global` limiter with key `csv:<tenantId>`, nominally 120 requests per 60 seconds shared across that tenant and process. A rejected request returns plain text `429 Too many requests` and rate headers. Successful downloads do not return rate headers (`src/lib/server/rate-limit.ts`, route files below).

| Method and path | Roles | Selection and order | Hard limit | Source |
|---|---|---|---:|---|
| `GET /bursar/export/csv` | `bursar` | All tenant invoices with student; `created_at DESC` | 5,000 | `src/routes/(app)/bursar/export/csv/+server.ts` |
| `GET /admin/reports/revenue-csv` | `school_admin`; impersonating `super_admin` | Paid tenant invoices with student; `created_at DESC` | 10,000 | `src/routes/(app)/admin/reports/revenue-csv/+server.ts` |
| `GET /admin/reports/teacher-attendance-csv` | `school_admin`; impersonating `super_admin` | Tenant teacher attendance; `marked_at DESC` | 10,000 | `src/routes/(app)/admin/reports/teacher-attendance-csv/+server.ts` |
| `GET /admin/reports/students-csv` | `school_admin`; impersonating `super_admin` | Tenant students; `first_name ASC` | 10,000 | `src/routes/(app)/admin/reports/students-csv/+server.ts` |
| `GET /admin/reports/subjects-csv` | `school_admin`; impersonating `super_admin` | Tenant subjects; `name ASC` | 10,000 | `src/routes/(app)/admin/reports/subjects-csv/+server.ts` |
| `GET /admin/reports/teachers-csv` | `school_admin`; impersonating `super_admin` | Tenant teachers; `first_name ASC` | 10,000 | `src/routes/(app)/admin/reports/teachers-csv/+server.ts` |

The handlers treat a null data result as `500`, but do not inspect the Supabase `error` object. Large datasets are materialized fully in memory before response generation.

## Login action

### `POST /login?/signIn`

**Source:** `src/routes/login/+page.server.ts`  
**Type:** SvelteKit named form action, `FormData`.  
**Fields:** `email`, `password`, both required after email trimming.  
**Authentication:** `supabase.auth.signInWithPassword`. On success, the service-role client selects the user's first recognized role and redirects `303` to its role landing page.

**Results:**

| Condition | Result |
|---|---|
| Missing email/password | `fail(400, { error: "Email and password are required." })` |
| Invalid credentials | `fail(401, { error: "Invalid email or password." })` |
| Authenticated but no recognized role | `fail(403, { error: "Your account is not assigned..." })` |
| Success | `303` to role route |
| Too many attempts | `fail(429, { error: "Too many login attempts..." })` |

The action limiter is in-memory, per Node process, keyed by `getClientAddress()`, with 5 attempts per 60 seconds. It does not set rate-limit headers on action responses. Loading `/login` separately consumes a fixed `login-page` bucket configured for 10 requests per 60 seconds and sets misleading rate headers; it does not limit by client. Supabase's local config additionally declares 30 sign-in/sign-up requests per IP per 5 minutes (`supabase/config.toml:180-194`), but hosted-project settings cannot be proven from this repository.

## Named page actions by role and path

### Action transport and invocation

Each entry below is invoked as `POST <path>?/<name>` with `multipart/form-data` or URL-encoded form data unless noted. These are first-party UI actions, not REST endpoints. Authentication failures may redirect before the action executes. Success objects and `fail(...)` payloads are SvelteKit action data, not a standardized JSON envelope.

### School administrator actions

The `/admin` layout requires `school_admin` or `super_admin`; route guarding permits `super_admin` under `/admin` only with an active impersonation (`src/routes/(app)/admin/+layout.server.ts`, `src/lib/server/middleware.ts:132-135`). Most actions repeat `requireTenantRole`; payroll and settings rely on the inherited layout and route guard.

#### `/admin/students`

**Source:** `src/routes/(app)/admin/students/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `first_name`, `last_name`, `admission_no`, optional `grade`, `status` | Names 1-100 chars; admission 1-50; grade max 50; status `active|inactive`. Inserts tenant-bound row. Duplicate admission maps DB `23505` to `409`; other DB errors are exposed in `500 message`. |
| `update` | same plus `id` | Same schema; `id` required but not UUID-validated. Updates by `id AND tenant_id`; zero matched rows still reports success. |
| `delete` | `id` | Required string only. Hard deletes by `id AND tenant_id`; zero matched rows reports success. |

#### `/admin/students/import`

**Source:** `src/routes/(app)/admin/students/import/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `import` | either `records` JSON or `file` ending in `.csv` | Parses arbitrary JSON array or a naive comma/newline split; appends authoritative `tenant_id`; bulk inserts all supplied object fields. Only non-empty records are required. There is no MIME check, file/record/field-size limit, schema allowlist, CSV quoting support, row validation, transaction report, or partial-success response. DB failure returns `500` with its message; success returns `{ success: true, count }`. |

#### `/admin/teachers`

**Source:** `src/routes/(app)/admin/teachers/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `first_name`, `last_name`, optional `employee_no`, optional comma-separated `subjects` | Names 1-100; employee number max 50; subject string max 500. Subjects become a trimmed string array. |
| `update` | same plus `id` | Requires `id`; update is tenant-qualified. |
| `delete` | `id` | Hard delete, tenant-qualified. |

Database failures return `500 { message: "Failed: <database message>" }`; unmatched update/delete reports success.

#### `/admin/parents`

**Source:** `src/routes/(app)/admin/parents/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `full_name`, `phone`, optional `email`, `locale`, `sms_consent` | Name 1-200; phone 1-20 with no format check; email max 254 but not email-validated; locale max 10; boolean coercion. Defaults locale to `en` and consent to `true`. |
| `update` | same plus `id` | Requires `id`; tenant-qualified update. |
| `delete` | `id` | Hard delete, tenant-qualified. |

Database messages are returned in `500` responses. No action creates or validates guardian/student links.

#### `/admin/users`

**Source:** `src/routes/(app)/admin/users/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `user_id`, `role` | User ID 1-100; role limited to `school_admin|principal|teacher|bursar|parent`; verifies a same-tenant profile, then inserts a role. Duplicate maps to `409`. Cannot assign `super_admin`. |
| `update` | same plus `id` | Requires `id`; updates role by tenant-qualified role-row ID. The submitted `user_id` must pass schema but is otherwise ignored and is not rechecked. |
| `delete` | `id` | Hard deletes tenant-qualified role row. |

There is no protection against deleting/demoting the last administrator or one's own role. Zero matched rows report success.

#### `/admin/subjects`

**Source:** `src/routes/(app)/admin/subjects/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `name`, optional `code` | Name 1-200; code max 50; tenant-bound insert. |
| `update` | same plus `id` | Requires `id`; tenant-qualified update. |
| `delete` | `id` | Hard delete, tenant-qualified. |

#### `/admin/fees`

**Source:** `src/routes/(app)/admin/fees/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `name`, `amount`, optional `due_date`, optional `term` | Name 1-200; amount coerced number `>= 0`; due date max 50 but not date-validated; term max 100. |
| `update` | same plus `id` | Requires `id`; tenant-qualified update. |
| `delete` | `id` | Hard delete, tenant-qualified. |

#### `/admin/invoices`

**Source:** `src/routes/(app)/admin/invoices/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `student_id`, `amount_due`, optional `due_date`, `status` | Student ID 1-100 and verified against tenant; amount coerced `>= 0`; due date max 50 only; status `unpaid|partial|paid|waived|overpaid`. Inserts with caller-selected financial status. |
| `update` | same plus `id` | Requires `id`; verifies student; tenant-qualified update. Caller may directly alter amount/status; no optimistic concurrency or payment-ledger reconciliation check. |
| `generateBulk` | `grade`, `fee_type_id`, optional `due_date` | Requires grade and same-tenant fee type; selects all active students in exact grade and inserts one unpaid invoice each in one bulk call. No duplicate/idempotency check or batch-size cap. |
| `delete` | `id` | Hard deletes tenant-qualified invoice. No explicit paid/payment-history guard. |

`create`/`update` return `404` if the student is absent. Bulk generation returns `404` for fee type, `400` for no students, and count in a success message. Database errors may be exposed.

#### `/admin/payroll`

**Sources:** `src/routes/(app)/admin/payroll/+page.server.ts`, `src/lib/server/payroll.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `generate` | `period_start`, `period_end` | Both required; `new Date(end) < new Date(start)` rejected, but strict date syntax is not validated. Requires positive tenant payroll rate. Calls service-only `aggregate_payroll_counts`, calculates runs, and upserts by tenant/teacher/period. Returns count, total, and dates. |
| `approve` | `id` | Requires a same-tenant existing `draft`; conditionally updates to `approved`. |
| `pay` | `id` | Requires a same-tenant existing `approved`; conditionally updates to `paid` and sets `paid_at`. |

Failures are `400`, `404`, `409`, or generic `500`. The two-step read/update has conditional status predicates but does not verify affected-row count after a race.

#### `/admin/scheduling`

**Sources:** `src/routes/(app)/admin/scheduling/+page.server.ts`, `src/lib/server/scheduling.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `class`, `subject_id`, `teacher_id`, `day_of_week`, `start_time`, `end_time`, `room`, optional `slot` | Requires non-empty values, day 1-7, lexical start `<` end, and same-tenant subject/teacher. Checks active, non-deleted overlaps for teacher, class, or room; returns `409` on conflict. Inserts active session. |
| `delete` | `id` | Requires ID; soft deletes by setting `active=false`, `deleted_at=now()` with tenant predicate. |
| `toggle` | `id`, `active` | `active` is true only for exact string `true`; updates by tenant. It does not rerun conflict checks and does not clear `deleted_at`. |

Times and IDs are not schema/UUID-validated. Concurrent creates can pass the application overlap check unless a database constraint prevents it.

#### `/admin/settings`

**Source:** `src/routes/(app)/admin/settings/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `save` | `name`, `logo_url`, `brand_primary`, `academic_year`, `mpesa_shortcode`, `mpesa_paybill`, `timezone`, `currency`, `payroll_rate_per_session`, checkbox toggles `sms_attendance`, `sms_payment_reminder`, `sms_payment_receipt` | Name nonblank; shortcode/paybill, if supplied, must be 5-7 digits. Payroll rate uses `parseFloat` and defaults invalid input to 0. Other strings have no length, URL, color, timezone, or currency validation. Replaces the `settings` JSON object with only the three toggles. Tenant-qualified update; generic `500` on failure. |

#### `/admin/credentials`

**Sources:** `src/routes/(app)/admin/credentials/+page.server.ts`, `src/lib/server/credentials.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `save` | optional `id`, `provider`, `environment`, `label`, `encrypted_blob` | Requires provider and blob. Any provider other than exact `mpesa` becomes `mobiwave_sms`; any environment other than `production` becomes `sandbox`. Writes the submitted blob directly to `credentials.encrypted_blob`, marks it active and untested. Despite the field name/UI claim, this action does not call `encrypt_credential`; the browser submits plaintext JSON/token text (`src/routes/(app)/admin/credentials/+page.svelte:139-150`). |
| `delete` | `id` | Requires ID; hard deletes same-tenant, tenant-scope credential. |
| `test` | `id` | Confirms same-tenant credential, marks untested, invokes the `credentials-test` Edge Function via service client, then marks `ok`/`failed`. The action expects `result.ok`, while the Edge Function returns `{ status, detail }`; therefore success is normally interpreted as failed. The Edge Function also does not establish the `app.tenant_id`/`app.role` database context required by `decrypt_credential`. |

Duplicate provider/environment is `409`; other action failures are generic `500` except Edge invocation text may be returned. The implementation does not enforce “test before active.”

#### `/admin/academic`

**Source:** `src/routes/(app)/admin/academic/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `name`, optional `term`, optional `exam_date`, `max_score` | Name nonempty; max score coerced and positive; term/date are unrestricted strings. Inserts creator ID. |
| `delete` | `id` | Requires ID; hard deletes same-tenant exam, cascading results. |

#### `/admin/academic/[examId]/edit`

**Source:** `src/routes/(app)/admin/academic/[examId]/edit/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `save` | `entries`, a JSON array | Parses JSON without exception handling. An empty array returns success without deleting existing results. Otherwise deletes all current same-tenant results for the path exam, then inserts caller-supplied `student_id`, `subject_id`, `score`, `grade`, and `remarks`. A declared Zod schema is unused. There is no check that the exam exists in the tenant, that referenced student/subject rows belong to it, that score is numeric/nonnegative/within exam maximum, or that entries are unique. Delete and insert are not transactional, so insertion failure loses prior results. |

### Teacher actions

#### `/teacher`

**Source:** `src/routes/(app)/teacher/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `mark` | `occurrence_id`, `status` | Requires linked teacher profile; status only `present|late`. Calls service-only `mark_own_teacher_attendance` with authoritative tenant, teacher, and profile IDs. RPC result `pending` succeeds; forbidden/not-assigned becomes `403`, other invalid/already-approved outcomes become `400`; RPC error becomes generic `500`. |

### Principal actions

#### `/principal`

**Source:** `src/routes/(app)/principal/+page.server.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `review` | `attendance_id`, `decision`, optional `note` | Decision only `approved|rejected`; rejection requires a nonblank note. Calls service-only `review_teacher_attendance` with authoritative tenant/profile. RPC `approved|rejected` succeeds; forbidden becomes `403`, stale/nonpending becomes `400`, RPC error becomes generic `500`. No note length limit. |

### Bursar actions

#### `/bursar/waivers`

**Sources:** `src/routes/(app)/bursar/waivers/+page.server.ts`, `src/lib/server/waivers.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `create` | `invoice_id`, `amount`, `reason` | Requires linked authenticated bursar role, nonempty ID/reason, finite truthy amount `> 0`. Calls atomic service-only `grant_waiver` with tenant and actor. Maps not found to `404`, settled/excess/invalid to `400`, RPC failure to generic `500`; success echoes amount/reason. No reason length limit. |

### Super-administrator actions

#### `/super-admin/tenants`

**Sources:** `src/routes/(app)/super-admin/tenants/+page.server.ts`, `src/lib/server/impersonation.ts`

| Action | Fields | Implemented validation and behavior |
|---|---|---|
| `impersonate` | `tenant_id` | If nonempty and a user exists, signs `{ tenantId, actorId, expiresAt, ip }` with HMAC-SHA256 and stores a one-hour HttpOnly, SameSite=Lax cookie. It does not verify that the tenant exists, does not set `Secure`, and always returns `{ success: true }`, including missing input. No audit event is written. |
| `stop` | none | Deletes impersonation cookie and redirects `303` to `/super-admin/tenants`. |

## Supabase Edge Functions

### Common behavior

- Deployment path convention: `<SUPABASE_URL>/functions/v1/<name>`.
- Shared JSON helpers return raw objects, not the envelope in `docs/api.md`. Errors are generally `{ "error": "CODE" }` (`supabase/functions/_shared/response.ts`).
- Responses include dynamic CORS headers. Allowed browser origins are `PUBLIC_URL`, local Vite origins, production, and staging. An unrecognized origin receives the first configured allowed origin, not its own origin (`supabase/functions/_shared/cors.ts`). Allowed methods advertise `POST, OPTIONS`.
- Functions do not set request IDs, rate-limit headers, cache policy, or security headers.
- Except for `OPTIONS` branches, none strictly rejects unsupported HTTP methods. Method/body behavior is listed per function.
- There is no implemented Edge Function rate limiter.

### `stk`

**Source:** `supabase/functions/stk/index.ts`  
**Intended method:** `POST`; `OPTIONS` supported, other methods proceed and usually fail while parsing JSON.  
**Auth:** required Supabase access token in `Authorization: Bearer <JWT>`, verified using `auth.getUser`. Caller must have a `parents.profile_id` row.  
**Request:** `{ "invoice_id": string }`. Amount and phone are not accepted from the caller; outstanding balance and parent phone are server-derived.

**Authorization and validation:** invoice must belong to the parent's tenant, be `unpaid|partial`, and its student must be linked to that parent. Any pending checkout for the invoice returns `429 { error: "DUPLICATE_REQUEST", message }`. Phone must normalize to `254[17]` plus eight digits, and outstanding amount must be positive. Production tenant M-Pesa credentials must resolve.

**Behavior:** attempts to decrypt tenant credentials, fetch a Daraja token, pre-insert a pending checkout, send STK Push, then replace the local random checkout ID with Daraja `CheckoutRequestID` or mark the row failed. The reviewed `decrypt_credential` function denies tenant credential access unless `app.tenant_id` matches (`supabase/migrations/20260713000001_credentials.sql:41-64`), but this Edge Function never calls `set_tenant_context`; with the reviewed migration state the decryption step therefore raises and the outer catch returns `500`.  
**Success/upstream response:** always `200` with the unfiltered Daraja JSON, including provider rejection.  
**Errors:** `400 INVALID_INVOICE`, `400 INVALID_PAYMENT_DETAILS`, `400 CREDS_NOT_FOUND`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 INVOICE_NOT_FOUND`, duplicate `429`, or generic `500 INTERNAL_ERROR`. Provider/network/JSON failures collapse to `500`.  
**Missing controls:** no rate limit per parent/phone/tenant, no idempotency key, no explicit fetch timeout, no checked error on pre-insert, and pending-count plus insert is not an atomic uniqueness guarantee.

### `mpesa-callback`

**Source:** `supabase/functions/mpesa-callback/index.ts`  
**Intended method:** `POST`; no `OPTIONS` branch and no method check.  
**Auth:** if `MPESA_CALLBACK_SECRET` is nonempty, exact `x-callback-secret` equality is required. If it is absent, the endpoint is unauthenticated.  
**Request:** Daraja shape `Body.stkCallback` containing at least `CheckoutRequestID` and `ResultCode`; successful callbacks may include `Amount` and `PhoneNumber`.

**Behavior:** failed ResultCode marks matching checkout failed and returns `200`. Successful callbacks load a checkout, return `already_reconciled` if completed, call service-only `reconcile_payment`, mark checkout completed, and optionally queue a receipt SMS according to tenant settings.  
**Responses:** `200 { status: "failed", reason }`, `200 { status: "already_reconciled" }`, `200 <RPC result>`, `400 invalid_callback`, `401 UNAUTHORIZED`, `404 unknown_checkout`, `409 <reconciliation result>`, or `500 INTERNAL_ERROR`.  
**Validation gaps:** the callback-supplied amount and phone are passed to reconciliation without equality checks in this function; authenticity is optional; there is no source allowlist, replay timestamp, request-size cap, rate limit, or constant-time secret comparison.

### `credentials-test`

**Source:** `supabase/functions/credentials-test/index.ts`  
**Intended method:** `POST`; `OPTIONS` supported; other methods proceed to JSON parsing.  
**Auth:** verified user JWT plus any `school_admin` or `super_admin` role from `user_roles`. A non-super administrator may test only credentials whose `tenant_id` is in their school-admin role set.  
**Request:** `{ "credential_id": string }`; presence only, no UUID schema.  
**Behavior:** attempts to decrypt the credential. M-Pesa-like data would trigger a fixed Safaricom OAuth request; SMS-like data would call `${MOBIWAVE_BASE or fixed default}/balance`. However, the function never establishes the `app.tenant_id`/`app.role` context required by `decrypt_credential`; tenant decryption returns an error and this endpoint returns `400 decrypt` under the reviewed migration state. If context is supplied outside the reviewed code, it updates test status after the provider request.  
**Response:** `200 { status: "ok"|"failed", detail }`; `detail` can include an upstream error or account balance. Errors: `400 credential_id_required`, `400 decrypt`, `401`, `403`, generic `500`.  
**Missing controls:** no rate limit, request timeout, strict provider schema, or response minimization. `MOBIWAVE_BASE` is operator-controlled configuration, not request-controlled SSRF input.

### `notify`

**Source:** `supabase/functions/notify/index.ts`  
**Methods:** `OPTIONS`; `POST` reads JSON; every other method processes with default limit 100.  
**Auth:** exact bearer value equal to `SUPABASE_SERVICE_ROLE_KEY`; this is an internal worker endpoint, not end-user JWT auth.  
**Request:** optional `{ "limit": number }` on POST. It is not type/range validated.  
**Behavior:** selects queued notifications with attempts under 3, resolves per-tenant Mobiwave credentials, attempts decryption and SMS sending, updates sent/failed/retry state, and caches sender IDs per invocation. Backoff is 1, 5, then 30 minutes. It also omits `set_tenant_context`; under the reviewed credential function this prevents tenant decryption, and the send path records a retry/failure rather than delivering.  
**Response:** `200 { processed, sent?, failed? }`, or `401 { error: "UNAUTHORIZED" }`. Database query errors are not checked.  
**Performance/concurrency:** sequential network sends make latency proportional to batch size. There is no claim/lock, `next_retry_at` is written but not filtered when selecting, and concurrent workers can double-send. Caller-controlled limits can create excessive work. No rate limit or provider timeout is implemented.

### `payment-reminders`

**Source:** `supabase/functions/payment-reminders/index.ts`  
**Methods:** `OPTIONS`; every other method executes, with no body.  
**Auth:** exact service-role bearer, internal scheduler/worker only.  
**Selection:** up to 200 `unpaid` invoices with due date before today and reminder older than three days or absent. Tenant setting `sms_payment_reminder` defaults enabled when absent. Uses the first linked parent with a phone.  
**Behavior:** conditionally updates `last_reminded_at` using its previously read value, then queues one SMS notification.  
**Response:** `200 { processed: number }`, `401`, or generic `500`.  
**Caveat:** Supabase update error alone does not establish that a conditional update matched a row; because no updated row is selected, concurrent runs may still both enqueue. Insert errors are ignored. No per-tenant fairness, consent check, rate limit, or pagination beyond the fixed first 200 is implemented.

## Pagination, filtering, and sorting actually implemented

There is no global cursor/filter/operator/sort protocol.

- `/admin/invoices`, `/admin/attendance`, `/admin/notifications`, and `/admin/messages` page loads accept only `?page=<integer>`, clamp below 1, and use fixed page size 100 (`src/lib/config.ts:10`). Invalid `page` can become `NaN`; it is not normalized after `parseInt`.
- Invoice, attendance, and messages page data include exact totals. Notification totals are computed by loading every matching notification status into application memory.
- Other lists use fixed limits: payroll 100, waivers 100 and invoice chooser 500, dashboards 5/10/50/100 depending on source, CSV 5,000/10,000, reminders 200, and Supabase API config max rows 1,000.
- Many page loads are unbounded, including core student, teacher, parent, subject, fee, exam, reconciliation, parent payment/message, and schedule lists.
- Sorting is hard-coded in queries. Client-side `DataTable` sorting is UI behavior and does not create server API sort parameters.
- No direct SvelteKit endpoint or Edge Function supports the cursor, `_gte`, `_lte`, `_like`, `_in`, or `order=` conventions claimed by `docs/api.md`.

## Rate limits actually implemented

| Surface | Key | Limit | Storage | Headers |
|---|---|---:|---|---|
| Login action | client address | 5 / 60 s | Node process memory | None on action response |
| Login page load | literal `login-page` shared globally | 10 / 60 s | Node process memory | `X-RateLimit-*`, but computed `X-RateLimit-Limit` is remaining-based and not the configured maximum |
| All CSV endpoints combined | `csv:<tenantId>` per process | 120 / 60 s | Node process memory | Only on rejected `429` |
| Supabase Auth local config | IP | 30 sign-in/sign-up / 5 min | Supabase Auth | Managed externally; deployed setting unverified |
| Edge Functions | none | none | none | none |
| Other form actions/endpoints | none | none | none | none |

The in-memory maps have no distributed coordination, persistence, proxy-aware identity strategy beyond `getClientAddress`, or stale-entry cleanup. Limits multiply with instances and reset on restart.

## Performance and operational characteristics

- The service-role client is recreated per request; Edge service clients are singleton per worker.
- Many page loads use `Promise.all`, and paginated helpers run count and data queries concurrently.
- Large CSVs and imports are fully buffered in memory. CSV generation is synchronous; no streaming or asynchronous export job exists.
- Notification delivery is sequential and has no lease/queue claim.
- Bulk invoices and academic-result replacement can create large single requests with no application cap.
- External Daraja/Mobiwave fetches have no abort timeout, circuit breaker, or explicit retry policy. Notification retries only apply after a worker invocation catches a send error.
- No API-level caching, ETags, compression policy, idempotency-key store, request-body limits, or version negotiation is implemented in repository code.
- Database indexes exist for several tenant/time/status paths, but this document does not assert the exact deployed migration state.

## `docs/api.md` aspirational mismatches

The following claims in `docs/api.md` are not implemented as described:

- No `https://api.reclass.mobiwave.ke/v1` router or `/v1` versioning/deprecation headers exist.
- No standard `{ data, error, meta }` envelope, request timestamp metadata, stable error-code catalog, or `next_cursor/total` convention exists.
- No global per-tenant 600/min, per-user 120/min, or STK 10/min/phone limit exists. Actual limits are listed above.
- No `Idempotency-Key` support exists. Checkout ID uniqueness and a pending pre-check are not equivalent to caller-key idempotency.
- The documented student CRUD/bulk-import REST endpoints do not exist; student operations are browser form actions.
- The recurrence/session calendar, student occurrence attendance, attendance lock, and analytics REST endpoints do not exist as described. Implemented attendance concerns teacher delivery and principal approval.
- Payment is the `stk` Edge Function accepting only `invoice_id`; it does not accept caller phone/amount, return the documented normalized payload, or enforce the documented rate limit. Callback path is a Supabase function, not `/v1/payments/callback`.
- Invoice reminders, ledger, report JSON/PDF jobs, polling jobs, tenant CRUD/usage, and outbound webhooks do not exist as documented.
- Notifications are processed from queued database records by an internal worker; there is no end-user `/notifications/send` endpoint or documented event engine API.
- Credential management is implemented as SvelteKit actions plus one test Edge Function, not metadata-only REST CRUD. The current save action writes submitted `encrypted_blob` directly and does not implement the documented server encryption flow.
- MFA, lockout after five failures, CAPTCHA, public REST bearer authentication for all routes, and a JWT `tenant_id` claim are not implemented in application code as claimed. Local Supabase MFA is explicitly disabled (`supabase/config.toml:279-292`).
- Async exports, 12-month version support, HMAC outbound webhooks, `UPSTREAM_UNAVAILABLE`, and most documented error statuses are future design only.

Treat `docs/api.md` as a target/design artifact until it is reconciled or clearly labeled. This file is the current implementation inventory as of the audit date.
