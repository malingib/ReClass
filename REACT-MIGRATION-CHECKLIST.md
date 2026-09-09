# React + Vite Migration Checklist — SvelteKit → Vite SPA

> Generated 2026-09-09. Sources: this repo (`src/routes`, `src/lib/server`, `supabase/functions`),
> reference `malangaweb/welfare-connect-main` (Vite + React + shadcn + TanStack Query + Supabase),
> Mobiwave developer docs v3 (2026) at `https://mobiwave.co.ke/developers/docs`.

## 0. Target stack (mirrors reference repo)

| Concern | Reference (`welfare-connect-main/package.json`) | Use in `apps/web-react` |
|---|---|---|
| Build | `vite`, React 18, TS | Same |
| Routing | `react-router-dom@6`, lazy pages, `ProtectedRoute` + `MemberProtectedRoute` + role arrays in `lib/rbac.ts` | Same pattern, role arrays from `src/lib/auth.ts` |
| Data | `@tanstack/react-query@5` (+ devtools) | Same; every `+page.server.ts` `load` becomes a `useQuery` |
| Mutations | `supabase.functions.invoke` / direct writes for non-privileged rows | Same; privileged writes (payroll, finance, SMS) go through Edge only |
| Forms | `react-hook-form` + `@hookform/resolvers` + `zod` | Port `src/lib/client/validation.ts` schemas |
| UI | Radix + shadcn (`components.json`), `tailwind-merge`, `sonner`, `lucide-react` | Copy shadcn set; port `src/lib/components/ui/*` |
| Charts | `recharts` | Replace d3 `DonutChart/LineChart/TrendChart.svelte` with recharts |
| Supabase | `@supabase/supabase-js`, anon key only in browser (`integrations/supabase/client.ts`) | Same; **never** ship `service_role` to browser |
| Observability | `@sentry/react` + `withSentryReactRouterV6Routing` | Replace `@sentry/sveltekit` |
| SMS templates | `src/lib/smsMessaging.ts` (trigger keys, `normalizePhone` → `254…`, `buildSmsPreview`) | Port as `src/lib/sms.ts` (see §2) |

Reference `App.tsx` pattern to copy: `AuthProvider` → `TooltipProvider` → `Toaster/Sonner` →
`Suspense(PageLoader)` → `SentryRoutes` with per-route `<ProtectedRoute allowedRoles={…}>`.

## 1. Mobiwave v3 — what to implement (and a bug to fix)

Base: `https://sms.mobiwave.co.ke/api/v3`. Bearer token from SMS Platform → Developer section.
**Server-only.** Never put the token in Vite code; keep it in Edge secrets / `tenant_credentials`.

| Endpoint | Method | Body / use |
|---|---|---|
| `/sms/send` (SMS) | POST | `{ recipient: "2547…", sender_id: "ESHULE", type: "plain", message: "…" }`. Multi-recipient: comma-separated. Optional `schedule_time`, `dlt_template_id` |
| `/sms/send` (WhatsApp) | POST | Same endpoint with `type: "whatsapp"` |
| `/sms/campaign` | POST | `{ contact_list_id, sender_id, type: "plain", message }` — bulk to contact lists |
| `/sms` / `/sms/{uid}` | GET | Delivery reports |
| `/contacts`, `/contacts/{group_id}/store|show|update|delete|all` | various | Contact groups for campaigns |
| `/balance`, `/me` | GET | Pre-flight balance check + profile |

**⚠️ Existing bug:** `supabase/functions/notify/index.ts:78` currently posts
`{ sender_id, type: 'plain', mobile, service_id: 0, message }`.
That is **not** v3 shape — v3 expects `recipient`, no `service_id`/`mobile`.
Migration must change the payload to `{ recipient: n.recipient, sender_id, type: 'plain', message: n.body }`
(plus optional `schedule_time`), normalize numbers to `254…`, and surface `GET /balance`
when `last_error` indicates insufficient units. Keep the existing queue/claim/backoff logic
(`claim_notifications`, `MAX_ATTEMPTS=3`, per-tenant `sms_sender_id` fallback `'ESHULE'`).

Port from reference: `normalizePhone`, per-trigger templates (`welcome_member`, `payment_received`,
`case_due`, `overdue_reminder`, …), `buildSmsPreview`, recipient normalization. Adapt keys to
school domains: `fee_due`, `receipt_issued`, `payroll_paid`, `attendance_flag`, `announcement`.

## 2. Keep vs. rewrite

**Keep as-is (Deno Edge, no rewrite):** `stk`, `mpesa-callback`, `b2c`, `b2c-result`,
`cleanup-pending-checkouts`, `credentials-test`, `_shared/*`.
**Fix in place:** `notify` (v3 payload above).
**New Edge functions to create:**
- `payroll-ops` — `generate | approve | mark-paid` for school + remedial runs (separation of duties server-side).
- `sms-campaign` — validates role, checks `GET /balance`, calls `POST /sms/campaign` or batched `/sms/send`, writes `notifications` rows.
- `reports-csv` — replaces the five `+server.ts` CSV endpoints (revenue, students, subjects, teacher-attendance, teachers) + `bursar/csv`.
- `role-switch` (optional) — only if active-role must be server-persisted; otherwise keep client-side (see §4 API row).

All 99 migrations stay. No schema rewrite; add RLS hardening migrations instead (§5).

## 3. Route mapping — `src/routes/*` → React

Conventions below: `Q` = `useQuery` on public schema/RPC with anon key + RLS;
`M→Edge` = `useMutation` invoking the named Edge Function (service_role inside, never in browser);
`RLS` = policy to add/verify.

### 3a. Root / auth shell

| SvelteKit source | React target | Data / notes |
|---|---|---|
| `src/routes/+layout.svelte`, `+error.svelte`, `src/app.html/css` | `apps/web-react/index.html`, `src/main.tsx`, `src/App.tsx`, `src/components/ErrorBoundary.tsx` | Sentry + `AuthProvider` + `TooltipProvider` + `Toaster/Sonner` + `Suspense` |
| `src/routes/+page.svelte` (landing) | `src/pages/Index.tsx` (`/`) | Static; link to `/login` |
| `src/routes/login/+page.svelte` + `+page.server.ts` | `src/pages/Login.tsx` (`/login`, `/admin/login` → redirect) | `supabase.auth.signInWithPassword`; then `user_roles` → active role → redirect via `roleRoutes` |
| `src/routes/(app)/+layout.svelte` + `+layout.server.ts` | `src/components/AppShell.tsx` + `ProtectedRoute` | Role-gated nav from `src/lib/auth.ts` (`isRole`, `roleRoutes`); **not** a security boundary |
| `src/routes/(app)/notifications/+page.svelte` | `src/pages/Notifications.tsx` | Q `notifications` (own + tenant inbox); realtime subscribe |

### 3b. Admin

| SvelteKit source | React target | Data / notes |
|---|---|---|
| `(app)/admin/+page.svelte` + `+page.server.ts` | `src/pages/admin/Dashboard.tsx` (`/admin`) | Q `v_teacher_attendance_daily`, `payments`, `invoices`, `students`, `sis_enrollments`, `sis_admissions`; recharts trend cards |
| `(app)/admin/analytics/*` | `src/pages/admin/Analytics.tsx` | Q aggregate RPCs/views; add `useDashboard.ts`-style hook like reference |
| `(app)/admin/admissions/*`, `enrollment/*`, `graduation/*`, `retention/*`, `lessons/*`, `modules/*`, `operations/*`, `calendar/*` | `src/pages/admin/*` (same slugs) | Q tables + `POST/PATCH` via anon where RLS allows; privileged transitions → Edge/RPC |
| `(app)/admin/audit/*`, `reports/*`, `settings/*`, `users/*` | `src/pages/admin/{Audit,Reports,Settings,Users}.tsx` | Audit read-only Q; settings/users mutations → Edge with `school_admin` check |
| `(app)/admin/students/[id]/*` | `src/pages/admin/StudentDetails.tsx` (`/admin/students/:id`) | Q `students` + enrollments + invoices + payments |

### 3c. SIS

| SvelteKit source | React target |
|---|---|
| `(sis)/sis/*`, `(sis)/students/*` (+`import`), `(sis)/subjects/*`, `(sis)/teachers/*`, `(sis)/parents/*`, `(sis)/sis/classes/*`, `(sis)/sis/admissions/*` | `src/pages/sis/{Overview,Students,StudentImport,Subjects,Teachers,Parents,Classes,Admissions}.tsx` under `/admin/sis/*` + `/admin/students/*` + `/admin/parents` |
| `src/lib/server/_sis/{sis,students,provisioning}.ts` | Q reads direct; `students/import` batch + provisioning → Edge `sis-provision` (or DB function) with tenant scoping |

### 3d. Finance (Bursar owns)

| SvelteKit source | React target | Data / notes |
|---|---|---|
| `(finance)/fees/*`, `(finance)/payment-definitions/*` | `src/pages/finance/{Fees,PaymentDefinitions}.tsx` | Port `feeTypeCrud.ts`; mutations `school_admin/bursar` → Edge-guarded or RLS-checked RPC |
| `(finance)/finance/*` (overview), `income/*`, `expenses/*` | `src/pages/finance/{Overview,Income,Expenses}.tsx` | Q `payments`, `invoices`; `bank-payments.ts` flows stay server-side |
| `(finance)/finance/payroll/*` + actions `generate/approve/mark-paid` | `src/pages/finance/Payroll.tsx` + `useSchoolPayroll()` | **M→`payroll-ops`**; never generate/approve from browser anon path |
| `(finance)/finance/receipts/*`, `(finance)/receipts/[id]/print/+server.ts` | `src/pages/finance/Receipts.tsx` + `ReceiptPrint.tsx` (`/finance/receipts/:id/print`) | Q `receipts`; print view calls `reports-csv`-style Edge or signed URL |
| `(finance)/reports/*` + 5 CSV `+server.ts` | `src/pages/finance/Reports.tsx` | **M→`reports-csv`**; keep filename/column parity |
| `(app)/bursar/*`, `bursar/csv/+server.ts`, `(app)/bursar/receipts/*` | `src/pages/bursar/{Dashboard,Receipts}.tsx` | Same guards (`bursar` role); CSV → `reports-csv` |
| `(app)/receipts/*` | `src/pages/Receipts.tsx` | Evidence view; Q only |
| `(app)/admin/payments/unmatched/*` | `src/pages/finance/UnmatchedPayments.tsx` | Q `checkout_requests` pending/failed; reconcile action → Edge |

### 3e. Remedial / ReClass (committee operates)

| SvelteKit source | React target | Data / notes |
|---|---|---|
| `(remedial)/reclass/*`, `reclass/students/*`, `reclass/students/[id]/*` | `src/pages/reclass/{Dashboard,Students,StudentDetails}.tsx` | Q remedial enrollments + attendance; from `_remedial/dashboard.ts` |
| `(remedial)/attendance/*` | `src/pages/reclass/Attendance.tsx` | Q `getAttendanceByTenant`; approve action = committee role only → Edge/RPC |
| `(remedial)/scheduling/*` | `src/pages/reclass/Scheduling.tsx` | From `_remedial/scheduling.ts` |
| `(remedial)/fee/*`, `remedial-fees/*`, `parent-payments/*`, `remedial/receipts/*` | `src/pages/reclass/{Fees,RemedialFees,ParentPayments,Receipts}.tsx` | Fee obligations vs. payroll separation (ARCH invariants 4–6) |
| `(remedial)/payroll/*` | `src/pages/reclass/Payroll.tsx` | **M→`payroll-ops`** (`kind=remedial`); treasurer prepares, chairman approves |
| `(remedial)/committee/*` | `src/pages/reclass/Committee.tsx` | Governance assignments (`remedial_role`) |

### 3f. Comms (shared service)

| SvelteKit source | React target | Data / notes |
|---|---|---|
| `(communications)/communications/*`, `announcements/*`, `templates/*` | `src/pages/comms/{Overview,Announcements,Templates}.tsx` | Template CRUD → RLS-checked tables; send → **M→`sms-campaign`** |
| `(communications)/notifications/*`, `notifications/templates/*` | `src/pages/comms/{Notifications,NotificationTemplates}.tsx` | Queue visibility from `notifications` table; worker is `notify` Edge + pg_cron |
| `CommunicationComposer.svelte`, `NotificationBell/Toaster.svelte` | `src/components/comms/{SmsMessageComposer,NotificationBell,NotificationToaster}.tsx` | Port reference `SmsMessageComposer` + `sms.ts` preview logic |

### 3g. Portals

| SvelteKit source | React target | Data / notes |
|---|---|---|
| `(app)/parent/*` (`child`, `fees`, `payments`, `pay`, `pay/status`, `timetable`) | `src/pages/parent/*` + `MemberProtectedRoute`-style `ParentProtectedRoute` | Scope via `getParentOwnership` → `useParentScope()` hook (studentIds); pay init → `stk` Edge; status poll → `checkout_requests` Q |
| `(app)/teacher/*` (`classes`, `tasks`, `timetable`, `committee`, `committee/payroll`) | `src/pages/teacher/*` | `teacher_type` (classroom/remedial/both) + `remedial_role` gating; committee payroll read-only except chairman/treasurer actions → `payroll-ops` |
| `(app)/principal/*` (`effectiveness`, `reports`, `school`) | `src/pages/principal/*` | Oversight reads; approvals only where assigned |
| `(app)/payroll/*` | `src/pages/PayrollOverview.tsx` | Cross-domain read; writes stay in `payroll-ops` |
| `(app)/about`, `(app)/account` | `src/pages/{About,Account}.tsx` | Account = own roles + active-role switcher |
| `super-admin/*` (`audit`, `modules`, `settings`, `tenants`) | `src/pages/super-admin/*` guarded by `super_admin` | Tenant/provisioning mutations → Edge only |

### 3h. API routes (`+server.ts` → Edge/RPC)

| SvelteKit source | React replacement |
|---|---|
| `api/healthz/+server.ts` | Edge `healthz` or static `src/pages/Health.tsx` + existing `src/lib/health.ts` probe |
| `api/logout/+server.ts` | `supabase.auth.signOut()` in `AuthContext.logout` (reference pattern) |
| `api/reconciliation/+server.ts` | Q `checkout_requests` counts directly, or Edge `reports-csv?action= преобразование` — prefer direct Q (no secret needed) |
| `api/role/switch/+server.ts` | Client active-role store (`localStorage` + `user_roles` validation query); server persistence only if audit requires it |
| CSV/print `+server.ts` (6 files) | Edge `reports-csv` (signed, role-checked) |

## 4. Server lib mapping — `src/lib/server/*` → React/Edge/RLS

| Server module | React/Edge target |
|---|---|
| `_auth/{auth,capabilities,middleware}.ts` | `src/contexts/AuthContext.tsx` + `src/components/ProtectedRoute.tsx` + `src/lib/rbac.ts` (role arrays) + `user_roles` Q; Edge re-validates role per call |
| `_auth/ownership.ts` (`getParentOwnership`) | `src/hooks/useParentScope.ts` (anon Q scoped by `studentIds`) + RLS `students.guardian_id = auth.uid()`-equivalent |
| `_platform/{query,validation,rate-limit,csv,terms,contracts,payment-channels,dashboard-queries,log,platform,credentials}.ts` | Pure helpers → `packages/shared` (de-Svelte) or `src/lib/*`; `rate-limit` + `credentials` + `csv` → Edge side only |
| `_finance/{payments,bank-payments,feeTypeCrud,notify,payroll,receipts}.ts` | Reads → Q; writes → `stk`/`b2c`/`payroll-ops`/`reports-csv` Edge; `notify.ts` → `sms-campaign` Edge |
| `_remedial/{attendance,dashboard,scheduling}.ts` | Q + `useRemedial*` hooks; approve transitions → RPC/Edge with committee check |
| `_sis/{sis,students,provisioning}.ts` | Q + `sis-provision` Edge/DB function |
| `_communications/communications.ts`, `notification-events.ts` | `src/lib/sms.ts` (templates) + `sms-campaign`/`notify` Edge + `claim_notifications` RPC |
| `_dashboard/admin-dashboard.ts` | `src/hooks/useDashboard.ts` (reference pattern) |
| `supabase/server.ts`, `hooks.server.ts` | Deleted; replaced by anon browser client + per-Edge `getServiceClient` + RLS |

## 5. RLS hardening (do before cutover)

For each table touched by a former `locals.srv` query: `students`, `guardians`, `teachers`,
`sis_enrollments`, `sis_admissions`, `fee_types`, `invoices`, `payments`, `checkout_requests`,
`receipts`, `payroll_runs`, `payroll_payments`, `remedial_*`, `attendance`, `notifications`,
`tenants`, `user_roles`: assert `tenant_id` scoping on SELECT/INSERT/UPDATE/DELETE,
privileged INSERT/UPDATE (payroll approve/pay, receipt finalize, credential read) denied to `anon`/
`authenticated` and allowed only via `service_role` Edge. Add regression tests in
`supabase/tests/` mirroring reference `01_wallet_waterfall.test.sql` style.

## 6. Shared UI port list

`AppShell`, `DataTable`, `KpiCard`, `RecentActivity`, `Donut/Line/TrendChart` (→ recharts),
`FeeManager/LazyFeeManager`, `ReceiptModal/LazyReceiptModal/ReceiptsManager`,
`PayrollComponentsPanel`, `LoadingButton`, `ConfirmDelete`, `NotificationBell/Toaster`,
`CommunicationComposer`, all `ui/*` (button/card/dialog/alert/badge/…). Reference `ResponsiveTable`,
`ResponsiveGrid`, `ResponsiveForm`, `StatsCard`, `TransactionList/DetailModal` are good templates.

## 7. Env & secrets

```
# apps/web-react/.env (browser — anon only)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=

# Edge / server only (never VITE_)
MOBIWAVE_API_TOKEN=          # Bearer for api/v3
MOBIWAVE_SENDER_ID=ESHULE
SUPABASE_SERVICE_ROLE_KEY=   # Edge only
```

The `sbp_…` management token provided stays local (e.g. `supabase login` / CI secret), never committed.

## 8. Phase plan (status 2026-09-09 — implemented)

- [x] P0 Scaffold `apps/web-react` + CI lint/typecheck/test gates
- [x] P1 Auth + roles + AppShell + `useParentScope` + RLS baseline migration
- [x] P2 Fix `notify` → Mobiwave v3 payload + add `sms-campaign` Edge + `sms.ts` templates + balance pre-check
- [x] P3 Add `payroll-ops` + `reports-csv` Edge; finance + payroll + receipts pages
- [x] P4 Port SIS → remedial → portals → comms → admin → super-admin (domain order in §3)
- [x] P5 Shared UI kit (`ui.tsx`, `DataTable`, `KpiCard`, recharts `TrendChart`, modals) + Vitest (`sms.test.ts`, 6 passing) + Playwright smoke (3 passing)
- [ ] P6 Parallel-run + cutover Vercel (SvelteKit SSR → Vite static + Edge), decommission routes
