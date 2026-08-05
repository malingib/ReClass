# ReClass — Project Graph (2026-07-13)

> Snapshot of the **planning package** (docs/ + migrations/). No live code applied to `rlswdeswlkuaigwtojxw`.
> Machine-readable: `reclass-graph.json` · Visual: `reclass-graph.html`

## Non-obvious structure (why this graph matters)

1. **Migration 0001 is the root dependency.** All 4 Edge Functions and the `resolve_credential` / `reconcile_payment` RPCs depend on `0001_credentials.sql` (the `credentials` table + RLS + `decrypt_credential()` SECURITY DEFINER). Build MUST apply 0001 before anything else.
2. **Strict credential model is enforced in 3 layers** — DB CHECK constraint (0001), `resolve_credential()` logic (0002), and Edge Function code. A "fall back to owner's platform_billing creds" bug is structurally impossible: `resolve_credential` returns NULL on miss and the Edge Functions hard-fail with `CREDS_NOT_FOUND`.
3. **SMS is single-channel Mobiwave** — the `notify` Edge Function has no WhatsApp branch; `notifications.channel` CHECK excludes it.

## Query 1 — trace the payment data flow (API → DB)

```
parent taps "Pay" (SMS deep-link / portal)
  → edge-stk.ts  (builds Daraja STK request; resolves tenant school_send daraja creds)
  → Daraja STK Push → parent authorizes on phone
  → Daraja → edge-mpesa-callback.ts  (verifies, calls reconcile_payment())
  → 0003_reconcile_payment.sql  (idempotent: lock row, credit once by CheckoutRequestID, recompute invoice balance)
  → invoices / payments tables (database.md)
  → reconcile_payment fires notify path
  → edge-notify.ts  (queues Mobiwave SMS confirmation to parent)
```

## Query 2 — what depends on the credentials table?

- `0002_credential_resolution.sql` — reads credentials, defines `resolve_credential()`
- `0003_reconcile_payment.sql` — indirect (called by callback which uses creds)
- `edge-stk.ts` — `resolve_credential` + `decrypt_credential`
- `edge-mpesa-callback.ts` — indirect via reconcile
- `edge-notify.ts` — `resolve_credential` + `decrypt_credential` (Mobiwave token)
- `edge-credentials-test.ts` — `decrypt_credential` + validates both providers
- `api.md` `/credentials` CRUD + `/credentials/:id/test`
- `security.md` — encryption-at-rest rules for credentials
- `adminguide.md` — tenant credential management UI

## Build order (apply sequence)

`0001` → `0002` → `0003` → deploy `stk` → `mpesa-callback` → `notify` → `credentials-test`
