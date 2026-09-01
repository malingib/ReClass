# eShule — External Integrations

> **Current-state integration reference — 1 September 2026.** Provider credentials are tenant-scoped unless an operation is explicitly platform-owned. Never use platform credentials as an implicit tenant fallback.

## 1. Mobiwave SMS

SMS is the primary feature-phone communication channel. Tenant-originated school messages use the tenant's active `school_send` Mobiwave credential.

- API: Mobiwave SMS Platform.
- Authentication: tenant-scoped bearer credential.
- Message types: plain SMS for current school communications.
- Delivery failures are recorded and retried according to the notification service policy.
- STOP/opt-out handling must be respected where enabled.

Do not place real tokens, credentials or private provider responses in documentation, fixtures or logs.

## 2. Safaricom M-Pesa Daraja

M-Pesa is the payment provider for supported school payment flows.

### STK flow

```text
Parent / authorized user
        |
        v
 eShule payment request
        |
        v
  Daraja STK Push
        |
        v
Provider callback
        |
        v
Idempotent reconciliation
        |
        v
Payment transaction -> Receipt / payment evidence
```

The application must bind the payment to the correct tenant and intended invoice/obligation. Callback handling must be fail-closed when required protection is not configured, must reject conflicting transaction identities, and must not trust caller-supplied values over authoritative stored payment state.

Never document real paybill numbers, consumer secrets, passkeys, callback secrets or access tokens.

## 3. Credential ownership

Two purposes are deliberately separate:

- `school_send`: tenant-owned school credentials used for that school's messaging and payment operations.
- `platform_billing`: platform-owner credentials used only for explicit Mobiwave/platform operations.

For a school-originated operation:

```text
Tenant production school_send
        -> tenant sandbox school_send (where allowed)
        -> CREDS_NOT_FOUND
```

There is **no runtime fallback to `platform_billing`**. Any platform-managed commercial arrangement must provision an explicit tenant-scoped `school_send` identity rather than silently borrowing the owner's credentials.

Credentials should be encrypted at rest, never returned to the browser in plaintext, tested before activation and rotated after suspected exposure.

## 4. Notification event model

Notifications are shared infrastructure. Domain events can enqueue messages such as:

| Event | Typical channel | Ownering domain |
|---|---|---|
| Attendance/delivery event | In-app/SMS where configured | Teaching/ReClass |
| Invoice/reminder event | SMS/in-app | Finance |
| Payment received | SMS/in-app | Finance / Receipts |
| Payroll event | In-app/SMS where appropriate | Payroll |
| Announcement | SMS/in-app | School administration |

The notification service owns delivery state, retry behavior and provider interaction; it does not become the owner of the underlying business record.

## 5. Integration failure rules

- External calls require bounded timeouts.
- Retries must be idempotent.
- Provider identifiers must be stored safely and treated as external transaction identities.
- Secrets must never appear in logs or user-facing errors.
- Provider outages must produce controlled application states rather than false success.
- Reconciliation jobs must be safe to rerun.

## 6. Configuration checklist

Before enabling a provider in an environment, verify:

1. correct tenant/platform scope;
2. credential purpose;
3. provider environment (sandbox/production);
4. callback URL and required protection;
5. test status;
6. timeout/retry policy;
7. monitoring and alerting;
8. rotation/incident procedure.
