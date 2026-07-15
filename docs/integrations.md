# ReClass — Integrations (Mobiwave SMS + Safaricom Daraja)

**Audience:** backend/dev team implementing the notification engine and M-Pesa STK flow.
**Core rule:** every secret is **per-tenant** (school brings its own Daraja paybill + Mobiwave token, `purpose='school_send'`). The platform owner (`super_admin`) sets **`purpose='platform_billing'`** credentials = Mobiwave's OWN account, used only for platform billing/operations — **never as a fallback** for a school's sends/charges. Secrets are resolved at runtime by `credential.service` (see architecture.md, api.md §7, database.md `credentials`).

---

## 1. Mobiwave SMS Platform  (SMS only — WhatsApp is NOT in scope)

| Item | Value |
|---|---|
| Base URL | `https://sms.mobiwave.co.ke/api/v3` |
| Auth | `Authorization: Bearer <MOBIWAVE_API_TOKEN>` (per-tenant `school_send` cred) |
| Headers | `Accept: application/json`, `Content-Type: application/json` |

### 1.1 Send single SMS
```http
POST /sms/send
Authorization: Bearer ***
Content-Type: application/json

{
  "sender_id": "RECLASS",
  "type": "plain",                 // SMS only
  "mobile": "2547XXXXXXX",
  "service_id": 0,
  "message": "Hi Mama Fatuma, Juma has 1 remedial session today. Pay fees via *182*1#. - Malingi HS"
}
```
Response (success):
```json
{ "code": 1, "message": "...", "data": [ { "message_id": "msg-123", "mobile": "2547XXXXXXX" } ] }
```
Response (failure): `code != 1` → engine marks notification `failed`, retries w/ backoff.

### 1.2 Send to multiple recipients (bulk)
```http
POST /sms/send
{
  "sender_id": "RECLASS",
  "type": "plain",
  "mobile": "2547XXXXXXX,2547YYYYYYY",   // comma-separated
  "service_id": 0,
  "message": "..."
}
```

### 1.3 Campaign (contact-list bulk) — `/sms/campaign`
Use for whole-cohort announcements; recipient list prepped from `students`/`parents`.

### 1.4 Contacts — `/contacts`
Optional: sync parent phone book into a Mobiwave group for faster campaigns.

### 1.5 Balance — `/balance`  (used by `credentials/:id/test`)
```json
{ "code": 1, "data": { "balance": "45200.00", "currency": "KES" } }
```
A non-`code:1` response = credential invalid → `test_status='failed'`.

### 1.6 Sender ID
Register `RECLASS` (or per-school sender) with Mobiwave. Use a recognizable sender so parents trust the SMS.

---

## 2. Safaricom Daraja (M-Pesa STK Push)

| Item | Value |
|---|---|
| Base (prod) | `https://api.safaricom.co.ke` |
| Base (sandbox) | `https://sandbox.safaricom.co.ke` |
| Auth | OAuth `client_credentials` (consumer key/secret per-tenant `school_send`) |
| Callback | Supabase Edge Function `mpesa-callback` (public POST) |
| Passkey | per-tenant; used to build password = base64(shortcode+passkey+timestamp) |

### 2.1 STK Push request
```http
POST /mpesa/stkpush/v1/processrequest
Authorization: Bearer <daraja_access_token>
{
  "BusinessShortCode": "<school_shortcode>",
  "Password": "<base64(shortcode+passkey+timestamp)>",
  "Timestamp": "YYYYMMDDHHMMSS",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 5000,
  "PartyA": "2547XXXXXXX",
  "PartyB": "<school_shortcode>",
  "PhoneNumber": "2547XXXXXXX",
  "CallBackURL": "https://<project>.supabase.co/functions/v1/mpesa-callback",
  "AccountReference": "RECLASS-<invoice_id>",
  "TransactionDesc": "School fees"
}
```
- Amount KES 1 → sandbox test (per `stk` convention).
- Reconciliation is idempotent on `CheckoutRequestID` (see `mpesa-callback` + `reconcile_payment` SQL).

### 2.2 Callback handling
See `docs/migrations/edge-mpesa-callback.ts`. Threat model in security.md §callback:
Safaricom does not sign callbacks → reject unknown `CheckoutRequestID`, reconcile by
amount+tenant, optionally whitelist Safaricom egress IPs at a Cloudflare Worker in front.

---

## 3. Event → Endpoint Mapping (notification engine)

| Event | Channel | Mobiwave call | Payload |
|---|---|---|---|
| Absence marked (approved session) | SMS | `/sms/send` type=plain | "Your child was absent from {session}…" |
| Payment due (reminder) | SMS | `/sms/send` type=plain | "Outstanding KES {x}. Pay via M-Pesa…" |
| Invoice generated | SMS | `/sms/send` type=plain | "Term fees KES {x} due {date}" |
| Payment received | SMS | `/sms/send` type=plain | "Confirmed KES {x} received. Thank you." |
| Announcement | SMS | `/sms/send` type=plain | message |
| STK initiated | SMS (optional) | `/sms/send` type=plain | "Check your phone to approve KES {x}" |

All SMS use the **tenant's own `school_send` Mobiwave token**. Email (should-have) goes via SMTP/Mailgun, not Mobiwave.

---

## 4. Credential Resolution (runtime) — STRICT, NO OWNER FALLBACK

There are **two distinct credential purposes**:

- **`school_send`** (scope=`tenant`): a *school's own* Daraja paybill / Mobiwave token. Used to send that school's SMS and to charge that school's parents. Set by the school's admin in the tenant **Integrations** page.
- **`platform_billing`** (scope=`platform`): *Mobiwave's own* account, set by `super_admin`. Used **only** for platform operations — billing tenants, platform-initiated system notices, onboarding — **never** to send on a school's behalf.

**Resolution for a school-originated send/charge:**
```
resolve(tenantId, provider):
  1. credentials WHERE tenant_id=tenantId AND purpose='school_send'
       AND provider AND environment='production' AND is_active AND test_status='ok'
  2. else credentials WHERE tenant_id=tenantId AND purpose='school_send'
       AND provider AND environment='sandbox' AND is_active AND test_status='ok'   (dev/test only)
  3. else -> CREDS_NOT_FOUND
```
**There is NO step that falls through to `platform_billing`.** If a school has not configured its own `school_send` credentials, the send/charge is **rejected** with `CREDS_NOT_FOUND` and the action is surfaced to the admin ("Configure your Daraja/Mobiwave credentials to enable payments/messages"). This protects the platform owner's paybill from being silently used by tenants, and keeps each school's M-Pesa reconciliation clean (payments land on the school's own till).

**When `platform_billing` is used:** only by explicitly owner-scoped platform jobs (e.g. billing the school, or a Mobiwave-initiated maintenance notice), invoked with `super_admin` context. It is addressed by tenant id = NULL / purpose filter, never as a fallback for a tenant send.

A school may alternatively be on a **platform-managed paid plan** (Mobiwave sends on the school's behalf using a sub-account the owner provisions and bills the school for). That is an explicit commercial arrangement, not a silent fallback, and still results in `school_send` credentials (owned by the tenant, funded via the plan) — see §4.1.

### 4.1 Platform-managed plan (optional commercial model)
If a school opts into Mobiwave's managed plan, `super_admin` creates `school_send` credentials *for that tenant* (provisioned from the owner's Mobiwave sub-account) and assigns them to the tenant. The tenant still has its own `school_send` row; the owner simply pre-funds/provisions it. Reconciliation and isolation are unchanged. This is the *only* legitimate way owner resources serve a tenant — never a runtime fallback.

Decryption: `decrypt_credential(id)` SECURITY DEFINER returns plaintext inside Edge Functions only; never to the browser; never logged.

---

## 5. Sender ID & Deliverability Notes
- Register a consistent sender (`RECLASS` or school name) to maximize parent trust/open-rates.
- Respect SMS STOP opt-out: store `opted_out` per phone; engine skips opted-out recipients.
- Cost: bill per segment; keep messages ≤ 160 chars (single segment) where possible.
- Throttle bulk (campaigns) to avoid carrier filtering; spread large cohorts over batches.
