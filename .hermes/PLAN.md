# ReClass — Master Improvement Plan

> Generated from full codebase review (2026-07-15)
> Supabase access: sbp_d6c80f... (token stored in .env.local)

---

## Phase 0 — Critical Bugs (IMMEDIATE)

### 0.1 Fix deleted `attendance` table references
- **Files**: `src/routes/(app)/parent/attendance/+page.server.ts` queries `student_attendance` — table was DROPped in migration `20260713010004`
- **Fix**: Rewrite to query `teacher_attendance` or recreate `public.attendance` (student attendance) — this is a separate concept from teacher attendance
- **Check**: `supabase/migrations/20260713000004_rls_policies.sql` still has RLS for `attendance` table
- **Dependencies**: Migration re-order if restoring table

### 0.2 Wire M-Pesa STK Push (parent pay page)
- **Files**: `src/routes/(app)/parent/pay/+page.svelte` uses `setTimeout(resolve, 500)` — fake
- **Fix**: POST to Edge Function `stk/index.ts` with `invoice_id`, `tenant_id`, `amount`, `phone`
- **Also**: Add proper validation (phone format 2547XXXXXXXX, amount > 0)
- **Edge Function**: Already exists at `supabase/functions/stk/index.ts` — needs URL environment variable

### 0.3 Fix README Next.js → SvelteKit
- **File**: `README.md` lines 11-12 claim "Next.js 14 (App Router), React"
- **Fix**: Replace with "SvelteKit 5, Svelte 5, TypeScript, TailwindCSS 4"

### 0.4 Fix `hooks.server.ts` redirect logic
- **File**: `src/hooks.server.ts` lines 72-75 — prefix-based redirect blocks non-role pages (`/account`, `/notifications`)
- **Fix**: Allow-list paths that any authenticated user can access regardless of role

---

## Phase 1 — Core Functionality (MUST HAVE)

### 1.1 Student CRUD (Admin)
- **Pages**: `/admin/students`, `/admin/students/import`
- **Add**: Create/Edit modal (SvelteKit Superforms + Zod schema)
- **Add**: Delete with confirmation dialog
- **Add**: Import validation (Zod schema per row, error report)
- **DB**: Uses `public.students` — schema exists

### 1.2 Teacher CRUD (Admin)
- **Page**: `/admin/teachers`
- **Add**: Create/Edit/Delete modals
- **Add**: Subject assignment (multi-select)
- **DB**: Uses `public.teachers` — schema exists

### 1.3 Subject & Group CRUD (Admin)
- **Pages**: `/admin/subjects`, `/admin/groups`
- **Add**: Full CRUD with forms
- **DB**: `public.subjects`, `public.remedial_groups` — schemas exist

### 1.4 Fee & Invoice CRUD (Admin)
- **Pages**: `/admin/fees`, `/admin/invoices`
- **Add**: Fee type creation, invoice auto-generation from fee types + enrollment
- **Add**: Manual invoice creation for specific students
- **DB**: `public.fee_types`, `public.invoices` — schemas exist

### 1.5 Teacher Attendance Marking
- **Pages**: `/admin/attendance` (view), new teacher `/teacher/attendance/mark`
- **Add**: Teacher marks own attendance for assigned sessions
- **Add**: Pre-filled roster per session, bulk "all present" + per-student override
- **Add**: Late timestamp, absent → enqueue SMS
- **DB**: `public.teacher_attendance` — already exists

### 1.6 Parent M-Pesa Pay (real)
- **Page**: `/parent/pay`
- **Add**: Real STK Push via Edge Function
- **Add**: Invoice lookup by admission_no
- **Add**: Payment confirmation UI (poll checkout_requests status)
- **Add**: Error states (timeout, failed, phone invalid)

### 1.7 Parent Attendance View
- **Page**: `/parent/attendance`
- **Fix**: Query correct table (`teacher_attendance` or restored `attendance`)
- **Add**: Student attendance history per child

### 1.8 Enroll Students in Groups (Admin)
- **Page**: `/admin/enrollment`
- **Add**: Select student + select group + enroll
- **Add**: Bulk enrollment from student list
- **DB**: Need `group_members` table or add to `remedial_groups` logic

---

## Phase 2 — Important Features (SHOULD HAVE)

### 2.1 Attendance Lock & Principal Approval
- **Pages**: `/principal/approve`, new lock logic
- **Add**: 24h auto-lock after session
- **Add**: Principal approval workflow (select → approve → lock)
- **Add**: Edit-after-lock requires reason (audited)
- **DB**: `attendance.locked`, `attendance.edit_reason` — columns exist

### 2.2 School Settings Page
- **Page**: `/admin/settings`
- **Add**: Branding (name, logo, colors)
- **Add**: Academic year/terms
- **Add**: M-Pesa shortcode/paybill display
- **Add**: SMS toggle preferences (settings JSONB column exists via migration)
- **DB**: `public.tenants.settings` JSONB — column exists

### 2.3 Credentials Management (Admin)
- **Page**: `/admin/credentials`
- **Add**: Create/Edit Daraja + Mobiwave credentials
- **Add**: Test credential button (wires to `credentials-test` Edge Function)
- **Add**: Status badges (untested/ok/failed)
- **DB**: `public.credentials` — schema exists, encryption works

### 2.4 Payroll Generation
- **Page**: `/admin/payroll`
- **Add**: Auto-calculate from teacher_attendance × rate_per_session
- **Add**: Payroll run creation (weekly periods)
- **Add**: Approve/paid status workflow
- **DB**: `public.payroll_runs`, `public.tenants.payroll_rate_per_session` — exist

### 2.5 Reports (actual, not placeholder)
- **Pages**: `/admin/reports`, `/principal/reports`
- **Add**: CSV/PDF export of attendance, revenue, aging
- **Add**: Teacher workload report
- **Add**: Payment collection rate per term

### 2.6 Bursar Tools
- **Pages**: `/bursar/waivers`, `/bursar/export`
- **Add**: Waiver creation form (amount, reason → audited)
- **Add**: Revenue export (CSV for Excel)
- **Add**: Aging report with 30/60/90 day buckets

---

## Phase 3 — Communication & Notifications (SHOULD HAVE)

### 3.1 SMS Notification Worker
- **File**: `supabase/functions/notify/index.ts` — already built
- **Add**: Cron schedule to poll `notifications` table every 60s
- **Add**: Wire to real Mobiwave SMS API (credentials resolved)
- **Add**: Retry with exponential backoff (exists)
- **Add**: SMS templates for: absence alert, payment received, invoice due, payment reminder

### 3.2 In-App Notifications
- **Add**: Create notifications on key events (payment received, absence marked, attendance approved)
- **Add**: Notification list page (`/notifications`)
- **Add**: Realtime push via Supabase channel (subscription exists in NotificationBell)

### 3.3 Payment Reminders (Automated)
- **Add**: Cron job that checks invoices 3/7/14 days past due
- **Add**: Creates notification records → SMS worker picks them up
- **Add**: Configurable reminder intervals in tenant settings

---

## Phase 4 — Quality & Polish (COULD HAVE)

### 4.1 Testing Infrastructure
- **Add**: Vitest unit tests for utility functions (notifications, auth, formatting)
- **Add**: Zod schema tests for all forms
- **Add**: Playwright E2E for core flow: login → view students → create student → logout
- **Add**: Playwright E2E for M-Pesa flow: parent pay → callback → invoice updated

### 4.2 Type Safety
- **Add**: Proper Supabase types via `supabase gen types`
- **Add**: Replace all `any` in DataTable renders with proper generics
- **Add**: Type-safe RPC calls for Edge Functions

### 4.3 Code Quality
- **Add**: ESLint config
- **Add**: Prettier config
- **Add**: Pre-commit hooks (lint + type-check)
- **Add**: svelte-check in CI

### 4.4 Dashboard Performance
- **Fix**: `/admin/+page.server.ts` — replace 13 separate queries with a single SQL RPC
- **Add**: Pagination on all data tables (default 25, configurable)
- **Add**: Debounced search/filter on tables

### 4.5 Skeleton & Error States
- **Add**: Loading skeletons on every page (matching content shape)
- **Add**: Error boundaries per section (not just page-level)
- **Add**: Retry buttons on failed data fetches

---

## Phase 5 — UX & Design (COULD HAVE)

### 5.1 Dark Mode
- **Add**: System-preference + manual toggle
- **Add**: Dark variants of all design tokens
- **Deps**: Requires theme context store

### 5.2 Mobile Bottom Nav
- **Fix**: Currently shows only first 4 items — add overflow "More" menu
- **Add**: Active state indicators

### 5.3 Pagination & Search
- **Add**: Server-side pagination on all data tables
- **Add**: Search/filter bar on list pages
- **Add**: Column visibility toggles

### 5.4 i18n (English/Swahili)
- **Add**: Translation store
- **Add**: EN/SW toggle in header
- **Add**: Translate all UI labels, notifications, SMS templates

### 5.5 Calendar View
- **Page**: `/admin/scheduling`
- **Add**: Month/week/day agenda view (currently just a DataTable)
- **Add**: Conflict detection with override
- **Add**: Click session → roster

---

## Phase 6 — Cleanup & Removal

### 6.1 Remove Placeholder Pages
- Pages to implement (from placeholder text to real functionality):
  - `/admin/settings`
  - `/principal/approve`
  - `/principal/effectiveness`
  - `/principal/reports`
  - `/bursar/export`
  - `/bursar/waivers`
  - `/account`

### 6.2 Remove Mock Data
- **File**: `admin/+page.svelte` — hardcoded `calendarEvents`, `upcomingEvents` objects
- **Fix**: Fetch from DB or show empty states

### 6.3 Remove Dead Doc Files
- `docs/migrations/` folder contains duplicates of files in `supabase/migrations/` and `supabase/functions/`
- Either maintain as single source of truth or remove

### 6.4 Remove Orphaned RLS Policies
- Migration `20260713000004_rls_policies.sql` has RLS for `attendance` table which was dropped
- Migration `20260713000008_fix_rls_current_setting.sql` re-created them — but table is gone
- Clean up: remove `attendance` policies from both files or restore the table

---

## Implementation Order Summary

```
Week 1: Phase 0 (critical bugs) + 1.1-1.3 (Student/Teacher/Subject CRUD)
Week 2: Phase 1.4-1.8 (Fees, Attendance, Pay, Enroll)
Week 3: Phase 2.1-2.4 (Lock/Approve, Settings, Credentials, Payroll)
Week 4: Phase 2.5-2.6 + Phase 3 (Reports, Bursar, SMS, Reminders)
Week 5: Phase 4 (Testing, Types, Quality)
Week 6: Phase 5-6 (Dark mode, i18n, Calendar, Cleanup)
```

---

## Reference

- **DB Schema**: `supabase/migrations/20260712230000_core_tables.sql`
- **Edge Functions**: `supabase/functions/{stk,mpesa-callback,notify,credentials-test}/`
- **Auth Flow**: `src/hooks.server.ts`
- **UI Components**: `src/lib/components/`
- **Role Routes**: `src/lib/auth.ts`
- **Design Tokens**: `src/app.css`
