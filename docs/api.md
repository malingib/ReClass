# ReClass — API Design

**Style:** REST · **Base:** `https://api.reclass.mobiwave.ke/v1` · **Auth:** Supabase JWT (Bearer) · **Format:** JSON · **Errors:** envelope
**Note:** Primary CRUD uses Supabase PostgREST (auto-generated, RLS-enforced). This doc specifies the *custom* business endpoints implemented as Supabase Edge Functions (Deno/TypeScript) where logic goes beyond CRUD (payments, scheduling expansion, notifications, reports).

---

## 1. Authentication
- `POST /auth/login` → Supabase Auth email+password; returns JWT + refresh. (Handled by Supabase Auth endpoint; proxied.)
- All requests: `Authorization: Bearer <jwt>`. JWT carries `tenant_id` claim; server sets `app.tenant_id` for RLS.
- MFA: required for `school_admin`, `super_admin`, `bursar` (TOTP).
- Refresh: `POST /auth/refresh` with refresh token (httpOnly cookie).

## 2. Standard Envelope
```json
{ "data": {...}, "error": null, "meta": { "request_id": "uuid", "timestamp": "ISO8601" } }
{ "data": null, "error": { "code": "VALIDATION", "message": "…", "fields": {"phone":["invalid"]} }, "meta": {...} }
```

## 3. Pagination / Filtering / Sorting
- Cursor: `?cursor=<id>&limit=50` (default 50, max 200).
- Filter: `?status=unpaid&due_before=2026-08-01` (operators `_gte`,`_lte`,`_like`,`_in`).
- Sort: `?order=created_at.desc`.
- Response `meta`: `{ next_cursor, total }`.

## 4. Rate Limiting
- Per tenant: 600 req/min; per user: 120 req/min; STK: 10/min/phone.
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` on 429.
- 429 → `error.code = RATE_LIMITED`.

## 5. Idempotency
- Payment endpoints accept `Idempotency-Key` header; same key returns original result (prevents double-charge on retry/network blip). Also backed by `mpesa_checkout_id` UNIQUE.

---

## 6. Custom Endpoints (Edge Functions)

### Students
- `GET /students` — list (filtered by tenant via RLS). Supports CSV `?format=csv`.
- `POST /students/bulk-import` — multipart CSV; returns `{ created, failed:[{row,error}] }`.
- `POST /students` / `PATCH /students/:id` / `DELETE /students/:id` (soft).

### Scheduling
- `POST /sessions` — create recurrence; server expands to `session_occurrences` for active term; runs conflict check.
- `GET /calendar?from=&to=&teacher_id=&group_id=` — occurrences with conflict flags.
- Conflict response: `200` with `warnings:[{type:'room_double_book',...}]` (override via `force=true` + reason, admin only).

### Attendance
- `GET /occurrences/:id/roster` — students pre-filled.
- `POST /occurrences/:id/attendance` — body `{ marks:[{student_id,status}] }`; bulk upsert; sets `marked_at`. If occurrence locked → 409 with `error.code=LOCKED`.
- `POST /occurrences/:id/lock` (principal/admin) — sets `locked=true`; further edits require `edit_reason`.
- `GET /attendance/analytics?group_id=&term=` — rates/trends/chronic flags.

### Payments (M-Pesa)
- `POST /payments/stk`
  ```json
  { "invoice_id":"uuid", "phone":"2547XXXXXXXX", "amount": 2500 }
  ```
  Rules: amount ≤ invoice balance (else 422 `OVERPAYMENT`); triggers Daraja STK Push; stores `pending` payment with `mpesa_checkout_id`; returns `{ checkout_id, status:"pending" }`.
- `POST /payments/callback` (Daraja webhook) — verifies `x-mpesa-signature` HMAC; idempotent by `CheckoutRequestID`; on success → payment `paid`, invoice reconciled, notify parent (SMS) + bursar (realtime); on timeout/fail → `failed`/`pending`.
- `GET /invoices?status=unpaid` — outstanding; `POST /invoices/:id/reminder` → enqueue SMS.
- `POST /invoices/:id/waiver` (bursar/admin) — `{ amount, reason }`; updates invoice.
- `GET /ledger/:student_id` — full payment+waiver history.

### Notifications
- `POST /notifications/send` — `{ channel, recipient, template, data }` (internal/admin).
- Engine subscribes to DB events (attendance absent, invoice created, payment due) → auto-dispatches per tenant config.

### Reports
- `GET /reports/revenue?term=` , `/reports/attendance`, `/reports/workload`, `/reports/aging` — JSON.
- `GET /reports/export?type=revenue&format=pdf|csv` — async job; returns job id; poll `/jobs/:id` or email when done.

### Tenant / Admin (super_admin)
- `GET /tenants`, `POST /tenants` (onboard school), `GET /tenants/:id/usage`.

### Credentials (per-tenant + platform — see integrations.md & database.md)
- `GET /credentials` — list caller's visible creds (tenant admins see their tenant's; super_admin also sees `scope=platform`). Returns metadata only (never `encrypted_blob`).
- `POST /credentials`
  ```json
  { "scope":"tenant", "purpose":"school_send", "provider":"mpesa", "environment":"production",
    "label":"Malingi Prod Daraja",
    "secrets": { "consumer_key":"...", "consumer_secret":"...", "passkey":"...", "shortcode":"174379" } }
  ```
  Server encrypts `secrets` → `encrypted_blob` (Vault KEK). For `scope=platform` only super_admin, and `purpose` must be `platform_billing` (owner's own account for billing/ops). A tenant (`scope=tenant`) credentials MUST be `purpose='school_send'`.
- `PATCH /credentials/:id` — update label/activate/deactivate, or rotate secrets (re-encrypts).
- `DELETE /credentials/:id` — soft delete (deactivate). Hard delete only via purge.
- `POST /credentials/:id/test` — validates against provider (Mobiwave `/balance`; Daraja token fetch + sandbox STK), sets `test_status`/`last_tested_at`. Must pass before `is_active=true` can be used in live sends.
- **Resolution (internal):** `credential.service.resolve(tenantId, provider)` → tenant active prod `school_send` cred → else tenant sandbox `school_send` → else **`CREDS_NOT_FOUND` (hard fail, no owner fallback)**. `purpose='platform_billing'` creds are used ONLY by owner-scoped platform jobs (billing/operations), never as a tenant fallback. Never returns plaintext to client.

---

## 7. Error Codes
| Code | HTTP | Meaning |
|---|---|---|
| VALIDATION | 422 | Field errors |
| UNAUTHENTICATED | 401 | Missing/expired JWT |
| FORBIDDEN | 403 | Role/RLS denied |
| NOT_FOUND | 404 | Resource absent (or hidden by RLS) |
| LOCKED | 409 | Attendance locked |
| OVERPAYMENT | 422 | Exceeds invoice balance |
| RATE_LIMITED | 429 | Throttled |
| CONFLICT | 409 | Duplicate/version |
| UPSTREAM_UNAVAILABLE | 502 | M-Pesa/SMS down (queued) |
| INTERNAL | 500 | Bug (alerted) |

## 8. Versioning & Deprecation
- URL version `/v1`. Breaking changes → `/v2`; old version supported ≥ 12 months with `Deprecation` header + banner.

## 9. Webhooks (outbound, future)
- `payment.succeeded`, `attendance.locked` → tenant-configured URL (HMAC-signed). For future ERP integration.

## 10. Example: STK happy path
```
POST /v1/payments/stk  {invoice_id, phone:"254712345678", amount:2500}
→ 202 {checkout_id:"ws_abc", status:"pending"}
[Daraja sends STK to parent phone]
POST /v1/payments/callback {CheckoutRequestID:"ws_abc", ResultCode:0, Receipt:"QBD123", Amount:2500}
→ 200 reconciles; invoice→paid; SMS "Welcome, fees received" to parent; realtime update to bursar
GET /v1/ledger/:student_id → shows paid invoice + receipt
```
