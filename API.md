# eShule — Implemented Application Interfaces

> **Current-state interface reference — 1 September 2026.** This document describes the application's implemented interface categories. It is not a promise of a public third-party REST API, and repository presence does not prove production deployment.

## 1. Interface types

eShule currently exposes three application interface categories:

1. **SvelteKit page actions** under `src/routes/**/+page.server.ts` for first-party browser workflows.
2. **SvelteKit route handlers** under `src/routes/**/+server.ts` for direct HTTP endpoints.
3. **Supabase Edge Functions** under `supabase/functions/**` for provider callbacks, integrations and background operations.

Supabase PostgREST may also be exposed according to deployed grants/RLS, but generated CRUD is not treated as a stable eShule public API.

There is currently no supported `/v1` public REST contract unless a separately versioned API is introduced and documented.

## 2. Common interface rules

- Authenticate and verify identity server-side.
- Resolve tenant context from authoritative server context.
- Enforce roles/capabilities server-side.
- Validate all untrusted input before domain operations.
- Verify ownership of referenced records, not only the primary record.
- Keep error responses safe and free of database/provider/credential details.
- Treat callbacks, jobs and external requests as retryable and potentially duplicated.

## 3. Page-action convention

Named SvelteKit actions normally use:

```text
POST /route?/actionName
```

with form data unless a route explicitly defines another content type.

A privileged action should follow:

```text
Authenticate
  -> Resolve tenant/role
  -> Validate input
  -> Authorize capability/ownership
  -> Execute domain operation
  -> Return safe result
```

The presence or absence of a button in the UI is not authorization.

## 4. Domain interface map

| Domain | Primary responsibility |
|---|---|
| Administration | students, teachers, parents, subjects, users and school configuration |
| Teaching | assigned teaching work, schedules and attendance/delivery |
| ReClass | remedial programme operations and committee governance |
| School finance | fees, invoices, receivables, reconciliation and waivers |
| Payroll | compensation components, payroll runs, approvals and payout workflow |
| Receipts | actual payment evidence and payment history |
| Communication | notification events, templates, delivery and retry state |
| Governance/audit | approvals, audit evidence and accountability |

## 5. Direct HTTP endpoints

### `GET /api/healthz`

Application health endpoint. Treat it as a shallow probe unless the deployment explicitly verifies database and dependency readiness separately.

### `GET /api/logout`

Legacy logout endpoint. State-changing authentication operations should not rely on GET semantics for new implementations.

### `POST /parent/messages`

First-party parent messaging endpoint. The server must derive the sender from authenticated context and verify tenant, linked-student/teacher relationship and conversation participation before writing a message.

## 6. Payment interface invariants

Payment initiation/reconciliation must:

- bind the request to the correct tenant and permitted obligation;
- use authoritative stored amounts where possible;
- reject conflicting provider transaction identities;
- be retry-safe and idempotent;
- create payment evidence once;
- keep receipts distinct from invoices and payroll runs;
- never expose provider credentials or raw database errors.

## 7. Error vocabulary

| Condition | Status | Meaning |
|---|---:|---|
| Unauthenticated | 401 | Sign-in required |
| Unauthorized | 403 | Authenticated but not permitted |
| Not found / hidden by ownership | 404 | Resource unavailable |
| Validation | 400/422 | Input is invalid |
| Conflict / replay | 409 | State or idempotency conflict |
| Provider unavailable | 502/503 | External dependency unavailable |
| Unexpected failure | 500 | Internal error; details logged safely |

Do not expose raw Supabase/Postgres/provider error strings to end users.

## 8. External integrations

Provider-specific behavior belongs behind the integration boundary where practical. Credentials are resolved by tenant and purpose. `platform_billing` credentials must never become a tenant fallback.

See `docs/integrations.md` for the integration model.

## 9. Public API policy

First-party SvelteKit actions are implementation interfaces, not a versioned public SDK. If third-party API access is introduced, define and test a versioned contract covering authentication, tenant scoping, rate limits, idempotency, compatibility and deprecation before exposure.

## 10. Maintenance rule

Update this document when a route/action or Edge Function contract changes materially. Keep examples synthetic and never publish credentials, real payment identifiers or personal data.
