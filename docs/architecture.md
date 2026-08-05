# ReClass — Architecture (C4 + Backend/Frontend)

## C4 Model

### Level 1 — System Context
- **Actors:** Teacher, Parent, School Admin, Principal, Bursar, Super Admin (Mobiwave).
- **System:** ReClass (SvelteKit + Supabase + Edge Functions).
- **External:** M-Pesa Daraja, SMS Gateway (Mobiwave), Email (SMTP/Mailgun), Google/M365 (future).
- **Responsibility:** digitize remedial scheduling, attendance, fees, parent comms; isolate tenants.

### Level 2 — Containers
1. **Web App** (SvelteKit, Vercel) — UI, role routing, PWA/offline queue.
2. **Supabase** (managed) — Postgres (RLS), Auth (JWT), Storage (notes/exports), Realtime (live ledger).
3. **Edge Functions** (Deno, Supabase) — STK trigger, M-Pesa callback, scheduling expansion, notifications, reports/export.
4. **Notification Worker** (cron/queue) — fans out SMS/Email; DLQ.
5. **External APIs** — M-Pesa, SMS (Mobiwave), Email.

### Level 3 — Components (Backend)
- `stk.service` — builds Daraja request, stores pending, idempotency.
- `mpesa.callback` — verifies signature, reconciles, notifies.
- `scheduler.service` — expands sessions → occurrences, conflict detect.
- `attendance.service` — mark/lock/analytics.
- `notification.engine` — event → channel → template → dispatch (Mobiwave SMS + email).
- `credential.service` — strict resolution (tenant `school_send` only; `platform_billing` for owner ops, never tenant fallback); `decrypt_credential()` SECURITY DEFINER for Edge-Function-only plaintext.
- `report.service` — queries + materialized views + async export.
- `audit.middleware` — appends every mutating action.

### Level 3 — Components (Frontend, SvelteKit)
```
src/routes/
  login, (app)/admin/... , principal/... , teacher/... , parent/...
src/lib/components/ (layout, dashboard, ui, charts)
src/lib/ (supabase client, RBAC, domain utilities)
```
- **State:** Svelte 5 runes for local UI state; route load functions for server data.
- **Forms:** SvelteKit Superforms + Zod (shared schema with API validation).
- **Error handling:** SvelteKit error routes + toast + retry; 401 → login.
- **Auth flow:** Supabase session → `profiles`+`user_roles` → role-based route guard + layout.
- **Offline:** attendance marks pushed to IndexedDB queue; flush on reconnect; read cache for timetable.

## Cross-cutting
- **Caching:** Supabase PostgREST cache headers; dashboard materialized views refreshed hourly; Redis later if needed.
- **Queues:** Supabase `notifications` table polled by worker (or pgmq); DLQ after 5 fails.
- **Jobs:** cron — payment reminders (3/7/14d), nightly report email, weekly cold backup.
- **Storage:** Supabase Storage (notes, exported PDFs, tenant logos); S3-compatible cold for backups.
- **Observability:** Sentry (frontend/edge), Supabase logs, UptimeRobot, central log drain.

## Principles applied
- Clean Architecture: services depend on interfaces (repo abstraction over Supabase client) so DB could swap.
- SOLID: single-responsibility services; dependency inversion via `lib/db` interface.
- DDD: bounded contexts (Admin, Scheduling, Attendance, Payments, Comms, Reports) map to modules.
- Multi-tenant: RLS is the hard boundary; no tenant data leaks by construction.
