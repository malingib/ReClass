# ReClass — Sprint Plan & Project Orchestration

**Project:** ReClass (Remedial Classes Management System)
**Vendor:** Mobiwave Innovations Ltd
**Anchor Tenant:** Malingi High School
**Plan Version:** 1.0
**Date:** 2026-07-13
**Author:** Engineering Management (Sprint Planning & Orchestration)

---

> **⚠️ Critical Discovery:** This project was originally scoped as a "Cal.com / Calendly clone" but the SRS describes a **school remedial-class management system** with scheduling, attendance, M-Pesa payments, parent portals, and multi-tenant school management. The Calendly comparison applies only to the booking/scheduling module (Module B). The remaining 90% of scope is unique to school operations. This has **significant implications** for resource planning, testing, and go-to-market positioning.

---

## Table of Contents

1. [Step 1: Review & Recommendations](#step-1-review--recommendations)
2. [Step 2: Project Complexity Estimate](#step-2-project-complexity-estimate)
3. [Step 3: Epics](#step-3-epics)
4. [Step 4: Features per Epic](#step-4-features-per-epic)
5. [Step 5: User Stories](#step-5-user-stories)
6. [Step 6: Engineering Tasks](#step-6-engineering-tasks)
7. [Step 7: Milestones](#step-7-milestones)
8. [Step 8: Sprint Plan (2-week sprints)](#step-8-sprint-plan)
9. [Step 9: Dependency Graph](#step-9-dependency-graph)
10. [Step 10: Testing Plan](#step-10-testing-plan)
11. [Step 11: Git Strategy](#step-11-git-strategy)
12. [Step 12: CI/CD Plan](#step-12-cicd-plan)
13. [Step 13: Risk Register](#step-13-risk-register)
14. [Step 14: Resource Planning](#step-14-resource-planning)
15. [Step 15: Backlogs](#step-15-backlogs)
16. [Step 16: Release Plan](#step-16-release-plan)
17. [Step 17: Quality Gates](#step-17-quality-gates)
18. [Step 18: AI Development Strategy](#step-18-ai-development-strategy)
19. [Step 19: Development Dashboard](#step-19-development-dashboard)
20. [Step 20: Execution Instructions](#step-20-execution-instructions)

---

## Step 1: Review & Recommendations

### 1.1 Missing Requirements

| # | Gap | Severity | Recommendation |
|---|-----|----------|----------------|
| R1 | **No student self-registration flow.** Students are entirely passive (no login at launch). Parents are the user for the "student" persona. The SRS mentions parent invite via admin but no student self-onboarding for the future. | Medium | Add a Phase 2 requirement for parent self-registration via OTP (already in Could Have). Re-classify as Should Have for engagement. |
| R2 | **No data export/import for backups visible in UI.** Backups are infra-only (Supabase PITR). Admins have no UI trigger for manual backup or quick data dump. | Low | Add a trivial `/admin/settings/export-all` feature for school admins to request a JSON/CSV backup on demand. |
| R3 | **School calendar / public holiday integration is Should Have but drives scheduling accuracy.** Without it, the scheduler will schedule sessions on public holidays that need manual cancellation. | Medium | Upgrade to Must Have. The conflict detector needs a holiday calendar to avoid scheduling on known holidays. |
| R4 | **No teacher substitution / temporary assignment flow.** If a teacher is absent, there's no mechanism to assign a substitute teacher to mark attendance. | Medium | Add as Should Have for Phase 1 — even a simple "substitute teacher can be assigned to a session occurrence" feature. |
| R5 | **No communications template preview.** SMS templates are defined but admins cannot preview how they render before sending. | Low | Nice-to-have but essential for trust; the first time an admin sends a broken template SMS, credibility drops. |
| R6 | **Bulk SMS cost tracking per tenant.** SMS costs per school are mentioned but there's no tracking or billing prep. Mobiwave needs this for reselling. | High | Add a `sms_usage` table and expose per-tenant SMS consumption. Critical for the SaaS business model. |
| R7 | **No session cancellation / rescheduling flow in teacher portal.** Teachers can see cancellations but there's no flow for a teacher to request a cancellation. | Medium | Add a "Request cancellation" button that routes to admin approval. |

### 1.2 Conflicting Requirements

| # | Conflict | Resolution |
|---|----------|------------|
| C1 | SRS says WCAG 2.1 AA (Section 6) but mentions dark mode as default UI pattern. Dark mode can reduce contrast ratios. | Ensure WCAG AA contrast ratios are tested in BOTH light and dark modes. Tokens must pass 4.5:1 in both. |
| C2 | SRS §10 says "attendance locked 24h OR on principal approval — whichever first." But §9.2 says "on approve/24h lock → status locked." The two descriptions differ slightly — the lock is best-effort 24h, not strict 24h. | Clarify: the 24h lock runs as a cron job. Principal approval is instant. Both converge to the same locked state. |
| C3 | SRS says M-Pesa is the only payment rail, but deployment.md mentions "Payments = M-Pesa Daraja (STK Push) as the only payment rail at launch." The word "at launch" implies future payment methods. | Lock: No other payment methods in Phase 1–2. Revisit in 2027. Remove ambiguity. |
| C4 | SRS says SMS is Must-Have but then says "opt-out SMS (STOP)." (Section 20, Table). However, Section 28 recommendation #3 says "Deep-linked fee payment from SMS" implying clickable links. SMS providers cannot always guarantee link clicks on feature phones. | Use short links (e.g., reclass.mobiwave.ke/pay/{invoice_id}) that work on both feature and smart phones. |

### 1.3 Risky Assumptions

| # | Assumption | Risk | Mitigation |
|---|------------|------|------------|
| A1 | M-Pesa sandbox testing matches production behaviour. | SAFARICOM SANDBOX IS NOTORIOUSLY UNRELIABLE. Callbacks timeout, amounts behave differently. | Build a Daraja mock/stub for integration tests. Run separate "production UAT" with real sandbox credentials and manual verification. |
| A2 | Teachers will reliably have smartphones for marking attendance. | SRS says "offline queue for dead-zone classrooms" but assumes smartphone/tablet exists. | Ensure the PWA works well on low-end Android phones (Chrome 80+). Provide a paper alternative as fallback. |
| A3 | Parents can receive and act on STK Push without needing a smartphone. | STK Push works on all phones (M-Pesa is USSD/SIM-toolkit based), but the *invitation* to pay via SMS link requires a smartphone or at least a phone that renders links. | The primary pay flow is: SMS contains short link → parent opens → enters phone → gets STK. For feature phones, the SMS can say "Pay via M-Pesa PayBill 123456 Account STUDENT-ID." |
| A4 | RLS alone is sufficient for tenant isolation. | RLS misconfigurations are easy to introduce during development and can leak data silently. | Every integration test MUST include a cross-tenant leak test. Add this as a CI gate. |
| A5 | M-Pesa callback URLs are reachable from the public internet. | If the Supabase project has network restrictions or if the EVO VPS firewall blocks the callback, STK will never complete. | Whitelist Safaricom egress IPs in Supabase network restrictions. Add callback logging + alerting. |

### 1.4 Technical Debt (Preventable)

| # | Item | Impact |
|---|------|--------|
| TD1 | Supabase config.toml has `enable_confirmations = false` for email auth — users can sign up without verifying email. The SRS says admin creates accounts. | Ensure sign-ups are admin-invite only. Disable public signups in Supabase Auth settings. |
| TD2 | `supabase/functions/` have duplicate copies in `docs/migrations/edge-*.ts`. This creates a drift risk. | Remove the `docs/migrations/` copies. The `supabase/functions/` directory is the single source of truth. |
| TD3 | No lint or type-check script in `package.json` beyond `next lint`. Add `tsc --noEmit`, `vitest`, and `prettier --check`. | Must-haves for CI. Add them to scripts in package.json. |
| TD4 | The `tsconfig.json` excludes `docs/` directory. If Edge Functions reference shared types, they won't be checked. | Add a separate tsconfig for Edge Functions or use Supabase CLI's built-in type checking. |

### 1.5 Missing User Stories

| # | User Story | Priority |
|---|------------|----------|
| US-M1 | As a **super admin**, I want per-tenant SMS usage/cost reports, so that I can bill schools accurately for messaging. | High |
| US-M2 | As a **teacher**, I want to request a session cancellation, so that I don't need to contact admin separately. | Medium |
| US-M3 | As an **admin**, I want a public holidays calendar per school year, so that the scheduler doesn't book sessions on holidays. | High |
| US-M4 | As a **bursar**, I want to view a payment aging report (7/14/30/60+ days), so that I can prioritize collection outreach. | High |
| US-M5 | As a **parent**, I want to receive a payment reminder before fees are due (not just after), so that I can plan ahead. | Medium |
| US-M6 | As an **admin**, I want to see which teachers haven't marked attendance within 2 hours of session end, so that I can follow up. | Medium |

### 1.6 Architecture Weaknesses

| # | Weakness | Impact | Recommendation |
|---|----------|--------|----------------|
| AW1 | **Single Supabase project for all tenants.** RLS provides logical isolation but cannot prevent a runaway query from affecting neighbours (noisy neighbour problem). | Performance degradation at 10k+ users. | Accept for Phase 1. Plan schema-per-tenant or project-per-tenant migration at 100k users. |
| AW2 | **No caching strategy for dashboards.** The SRS mentions materialized views refreshed hourly, but dashboard queries (especially revenue + attendance analytics) will scan 100k+ rows per query. | Slow dashboards under load (breach of p95 < 2s). | Implement Redis caching in Phase 2. For Phase 1, use aggressive materialized views + pg_cron refresh every 15 min. |
| AW3 | **Edge Functions are cold-start prone.** If the app is idle overnight, the first STK push in the morning may take 5–10s due to Deno cold start. | Parent STK UX degradation first thing in the morning. | Implement a keep-warm cron job that pings Edge Functions every 5 min during school hours (6am–8pm). |
| AW4 | **No offline-first strategy beyond attendance.** The timetable, student roster, and fee data have no offline read cache. | If the network drops, teachers cannot view timetables or student lists. | Use Service Worker + IndexedDB to cache timetable and roster data for offline reads. |
| AW5 | **Audit log is a single table for all actions.** At 100k students × 10 actions/student/day, this table grows at 1M rows/day. | Query performance degrades, storage grows. | Partition `audit_log` by month. Add retention policy: 7 years online, 7+ years archived to cold storage. |
| AW6 | **Notification engine uses a polled table pattern.** The `notifications` table is polled by a worker. This adds latency (up to 15s between poll cycles). | SMS delivery latency compounds with polling + batching. | Use Supabase Realtime (logical replication) to trigger the worker immediately on insert, with polling as fallback. |

---

## Step 2: Project Complexity Estimate

### 2.1 Overall Complexity: **HIGH** (7.5/10)

| Dimension | Score (1-10) | Rationale |
|-----------|-------------|-----------|
| **Business Logic** | 8 | Multi-role (6 roles), multi-tenant, attendance lock/approve, M-Pesa reconciliation, SMS engine, scheduling conflict detection |
| **Technical Architecture** | 7 | Supabase stack is modern but requires careful RLS design, Edge Functions in Deno, M-Pesa integration, offline PWA |
| **Integration Complexity** | 9 | M-Pesa Daraja STK Push is the highest-risk integration (external callback, timeout, reconciliation, idempotency). SMS gateway integration adds another external dependency |
| **Security Requirements** | 8 | Multi-tenant isolation, student data (minors), Kenya Data Protection Act, payment reconciliation security, credential management |
| **Data Model** | 6 | ~25 tables with RLS, triggers, audit, soft-delete. Manageable but must be precise |
| **UI/UX Complexity** | 7 | 6 distinct role views, bilingual (EN/SW), WCAG AA, PWA responsive, offline support |
| **Testing Complexity** | 8 | RLS leak tests, M-Pesa callback simulation, offline queue, idempotency, E2E multi-role flows |

### 2.2 Development Effort: **9-11 weeks** (not inclusive of UAT/hardening)

| Phase | Effort | 
|-------|--------|
| Foundation (DB, Auth, CI/CD, scaffold) | 1 week |
| Admin CRUD (students, teachers, groups) | 1.5 weeks |
| Scheduling + Calendar + Conflicts | 1 week |
| Attendance (mark, lock, approve, analytics) | 1.5 weeks |
| Payments (M-Pesa STK, callback, reconciliation, ledger) | 2 weeks |
| Parent Portal + Teacher Portal | 1.5 weeks |
| Reports + SMS + Audit + Polish | 1.5 weeks |
| QA, Hardening, UAT, Go-live | 1 week |
| **Total (with parallelization)** | **~10-11 weeks** |

### 2.3 Technical Risk: **HIGH** (primarily M-Pesa integration)

| Risk Area | Level | Rationale |
|-----------|-------|-----------|
| M-Pesa Integration | **Critical** | External API, callback unreliability, idempotency, sandbox/prod gaps |
| RLS Tenant Isolation | **High** | Zero-tolerance for cross-tenant data leaks |
| SMS Delivery | Medium | External provider reliability, opt-out compliance, cost tracking |
| Scheduling Conflicts | Medium | Edge cases with term breaks, holiday overlaps, teacher swaps |
| Offline Queue | Medium | IndexedDB sync conflicts, data loss on flush failure |
| PWA Responsiveness | Low | Well-understood pattern |

### 2.4 Security Risk: **HIGH**

| Risk | Level | Mitigation |
|------|-------|------------|
| Credential leak (tenant Daraja/Mobiwave secrets) | **Critical** | Vault encryption, never returned to browser, SECURITY DEFINER functions |
| Cross-tenant data access | **Critical** | RLS enforced on every table, CI leak tests mandatory |
| M-Pesa callback spoofing | **High** | CheckoutRequestID uniqueness + state machine (pending→completed) + FOR UPDATE invoice lock |
| Student PII exposure (minors) | **High** | Data minimization, consent management, soft-delete with anonymization |
| SMS opt-out compliance | Medium | STOP keyword handling, opt-out stored per phone, removal from all campaigns |

### 2.5 Business Risk: **MEDIUM-HIGH**

| Risk | Level | Rationale |
|------|-------|-----------|
| Timeline overrun (6-week founder commitment) | **High** | Full scope is 10-11 weeks, not 6. Phase 1 (MVP) is achievable in 6 weeks with scope trimming |
| M-Pesa reliability in production | **High** | Safaricom's sandbox and prod have known issues; callback unreliability is documented |
| Teacher adoption | Medium | Training and simple UX critical; offline mode essential |
| Parent smartphone penetration | Medium | SMS-first design mitigates this; USSD M-Pesa works on all phones |
| School fiscal year / term alignment | Low | Must align delivery with Malingi's term dates |

### 2.6 Critical Path

```
M1 (Data Model + Scaffold)
  └── M2 (Auth + Tenants + RLS + RBAC) [3 days]
        └── M3 (Admin CRUD: Students/Teachers/Groups/Fees) [1 week]
              ├── M4 (Scheduling + Calendar) [1 week]
              │     └── M5 (Attendance) [1 week]
              │           └── M7 (Teacher Portal) [0.5 week]
              └── M6 (M-Pesa Payments) [1.5 weeks] ← HIGHEST RISK
                    └── M7 (Parent Portal: view + pay) [0.5 week]
                          └── M8 (Reports + SMS + Audit) [1 week]
                                └── M9 (QA + UAT + Go-live) [1 week]
```

**Key insight:** M6 (Payments) is on the critical path AND is the highest-risk item. **Start M-Pesa integration as early as possible.** Don't wait until M3 is complete — begin Daraja sandbox exploration in week 1.

---

## Step 3: Epics

| Epic ID | Epic Name | Description | Business Value |
|---------|-----------|-------------|----------------|
| E-01 | **Project Foundation** | Supabase project, CI/CD, scaffolding, dev tooling, design token implementation | Enables all other work |
| E-02 | **Authentication & Authorization** | Login, MFA, RBAC, RLS, session management, invite flow | Security & access control |
| E-03 | **Tenant & School Administration** | Multi-tenant management, school settings, branding, academic terms | Core platform capability |
| E-04 | **Student & Parent Management** | CRUD, bulk import, parent linking, guardian relationships | Core data management |
| E-05 | **Teacher & Subject Management** | Teacher CRUD, subject catalog, remedial group definition | Core data management |
| E-06 | **Remedial Scheduling** | Session templates, calendar, conflict detection, holiday calendar | Core scheduling |
| E-07 | **Attendance Management** | Session roster, mark/lock/approve, analytics, offline queue | Daily ops value |
| E-08 | **Fee Definition & Invoicing** | Fee types, auto-invoicing, invoice status tracking | Revenue management |
| E-09 | **M-Pesa Payments** | STK Push, callback reconciliation, ledger, waivers, reminders | Revenue collection |
| E-10 | **Parent Portal** | Attendance view, timetable, fee payment, announcements | Parent engagement |
| E-11 | **Teacher Portal** | Timetable, attendance marking, student roster, notes upload | Teacher productivity |
| E-12 | **Principal Dashboard** | Attendance approval, effectiveness view, reports | Oversight |
| E-13 | **Bursar Dashboard** | Revenue view, reconciliation, waivers, aging report | Financial ops |
| E-14 | **Super Admin Console** | Tenant management, platform monitoring, usage stats | Platform ops |
| E-15 | **Notifications & SMS Engine** | SMS dispatch (Mobiwave), email, templates, opt-out, event triggers | Communication |
| E-16 | **Reports & Analytics** | Revenue, attendance, workload, aging, CSV/PDF export | Decision support |
| E-17 | **Audit & Compliance** | Immutable audit log, retention, data protection | Trust & compliance |
| E-18 | **Payment Aging & Reminders** | 3/7/14-day auto-reminders, aging report, payment-default risk. Moved from Should Have to Must Have for Malingi go-live. | Revenue recovery |
| E-19 | **Credential Management** | Per-tenant Daraja + SMS credential lifecycle; encryption, test, resolution (strict, no owner fallback). Split from E-03 because of security-critical nature. | Security & integrations |

---

## Step 4: Features per Epic

### E-01: Project Foundation
- F-01.01 Supabase project provisioning & configuration
- F-01.02 SvelteKit scaffold (Svelte 5, Tailwind, design tokens)
- F-01.03 CI/CD pipeline (GitHub Actions)
- F-01.04 Developer tooling (ESLint, Prettier, Vitest, Playwright)
- F-01.05 PWA manifest + service worker shell
- F-01.06 Environment configuration (dev/staging/prod)
- F-01.07 Error tracking (Sentry)

### E-02: Authentication & Authorization
- F-02.01 Supabase Auth integration (email+password)
- F-02.02 Login / Logout pages
- F-02.03 MFA (TOTP) for privileged roles
- F-02.04 RBAC role definitions & enforcement
- F-02.05 Row-Level Security (RLS) policies on all tables
- F-02.06 Session management (refresh, expiry, lockout)
- F-02.07 Invite flow (admin creates user → invite email/SMS)
- F-02.08 Password reset flow
- F-02.09 Account lockout after 5 failed attempts + CAPTCHA
- F-02.10 Role-based route guards (middleware)

### E-03: Tenant & School Administration
- F-03.01 Tenant CRUD (super admin)
- F-03.02 School settings (branding, M-Pesa config, term dates)
- F-03.03 Academic year / term management
- F-03.04 School holiday calendar
- F-03.05 User management per tenant (CRUD, role assignment)

### E-04: Student & Parent Management
- F-04.01 Student CRUD (per tenant)
- F-04.02 Bulk CSV import with validation
- F-04.03 Parent CRUD
- F-04.04 Guardian linking (student ↔ parent, ≤2)
- F-04.05 Student deactivation (soft-delete with fee check)

### E-05: Teacher & Subject Management
- F-05.01 Teacher CRUD
- F-05.02 Subject catalog
- F-05.03 Remedial group definition (subject + teacher + capacity)
- F-05.04 Teacher-subject assignment

### E-06: Remedial Scheduling
- F-06.01 Session template creation (day, time, recurrence)
- F-06.02 Session occurrence expansion (by term)
- F-06.03 Calendar view (month/week/agenda, role-scoped)
- F-06.04 Conflict detection (room double-book, teacher overlap)
- F-06.05 Admin override with reason logging
- F-06.06 Holiday calendar integration (skip/flag holidays)
- F-06.07 Session cancellation (with notification)

### E-07: Attendance Management
- F-07.01 Session roster generation (pre-filled student list)
- F-07.02 Bulk mark (all present) + per-student override
- F-07.03 Status options: present, late, absent, excused
- F-07.04 Late timestamp capture
- F-07.05 Attendance lock (24h cron + principal approval)
- F-07.06 Post-lock edit with reason + audit
- F-07.07 Offline attendance queue (IndexedDB)
- F-07.08 Attendance analytics (rate, trend, chronic flags)

### E-08: Fee Definition & Invoicing
- F-08.01 Fee type CRUD (name, amount, due date, term)
- F-08.02 Auto-invoice generation on fee assignment
- F-08.03 Invoice status tracking (unpaid, partial, paid, waived, overpaid)
- F-08.04 Invoice balance computation (amount_paid trigger)

### E-09: M-Pesa Payments
- F-09.01 STK Push initiation (POST /payments/stk)
- F-09.02 Daraja OAuth token acquisition
- F-09.03 M-Pesa callback handler (verify, reconcile, idempotent)
- F-09.04 Payment ledger (per-student history)
- F-09.05 Waiver application (amount, reason, audited)
- F-09.06 Overpayment → credit note (manual)
- F-09.07 Idempotency key enforcement
- F-09.08 Payment timeout handling (retry once, then pending)
- F-09.09 Reconciliation status dashboard

### E-10: Parent Portal
- F-10.01 Attendance view (per linked student)
- F-10.02 Timetable view (read-only)
- F-10.03 Fee view (outstanding + history)
- F-10.04 Pay now → STK Push initiation
- F-10.05 Announcements view
- F-10.06 EN/SW language toggle
- F-10.07 Profile management

### E-11: Teacher Portal
- F-11.01 Timetable (day/week view)
- F-11.02 Today's roster → attendance marking
- F-11.03 Student roster (enrolled in groups)
- F-11.04 Notes upload (PDF/photo via Supabase Storage)
- F-11.05 Session cancellation request
- F-11.06 EN/SW language toggle

### E-12: Principal Dashboard
- F-12.01 Attendance approval queue
- F-12.02 Effectiveness dashboard (attendance trends)
- F-12.03 Scheduling conflict override console
- F-12.04 Reports shortcut

### E-13: Bursar Dashboard
- F-13.01 Revenue overview (paid/owing by fee type)
- F-13.02 Payment aging report
- F-13.03 Waiver management
- F-13.04 Reminder sending (manual + auto)
- F-13.05 CSV/PDF export

### E-14: Super Admin Console
- F-14.01 Tenant onboarding workflow
- F-14.02 Per-tenant usage stats (users, payments, SMS)
- F-14.03 Platform monitoring (uptime, error rate, M-Pesa success rate)
- F-14.04 Global configuration

### E-15: Notifications & SMS Engine
- F-15.01 SMS dispatch via Mobiwave API
- F-15.02 Email dispatch (should-have: SMTP/Mailgun)
- F-15.03 Template library (per tenant, EN/SW)
- F-15.06 Event triggers (absence → SMS, payment → SMS, etc.)
- F-15.07 Retry with exponential backoff (max 3)
- F-15.08 Dead-letter queue on repeated failure
- F-15.09 SMS opt-out handling (STOP, store per phone)
- F-15.10 Per-tenant SMS balance tracking
- F-15.11 Notification preferences (per parent)

### E-16: Reports & Analytics
- F-16.01 Revenue report (collected vs owing, by term/fee)
- F-16.02 Attendance report (rate by student/group/teacher)
- F-16.03 Teacher workload report
- F-16.04 Payment aging report
- F-16.05 Export to CSV/PDF (async job)
- F-16.06 Scheduled email of reports (should-have)

### E-17: Audit & Compliance
- F-17.01 Immutable audit_log (append-only)
- F-17.02 Audit viewer (filter by actor, action, entity, time)
- F-17.03 Data retention / anonymization jobs
- F-17.04 Kenya DPA compliance (data minimization, consent)

### E-18: Payment Aging & Reminders
- F-18.01 3/7/14-day auto-reminder schedule (configurable per tenant)
- F-18.02 Payment aging report (7/14/30/60+ day buckets)
- F-18.03 Manual reminder trigger from invoice view
- F-18.04 Pre-due payment reminder (before due date)

### E-19: Credential Management
- F-19.01 Credential CRUD (per-tenant Daraja + SMS)
- F-19.02 Encryption via Supabase Vault (AES-256-GCM)
- F-19.03 Credential test (verify against provider)
- F-19.04 Credential resolution logic (strict, no owner fallback)
- F-19.05 Platform-billing credentials (super_admin only)
- F-19.06 Credential audit trail (create, update, test, deactivate)

---

## Step 5: User Stories (Representative — Key Stories)

Full 200+ backlog managed in issue tracker. Here are the highest-priority stories driving the sprint plan.

| Story ID | Epic | User Story | Acceptance Criteria | Priority | SP |
|----------|------|------------|---------------------|----------|----|
| US-01 | E-01 | As a developer, I want the Supabase project configured with RLS scaffold and CI/CD pipeline, so that I can iterate with confidence. | Supabase local + remote projects linked; GitHub Actions runs lint/typecheck/test on PR; migrations apply cleanly | Critical | 5 |
| US-02 | E-02 | As an admin, I want to log in with email+password and be directed to my role-appropriate dashboard. | Login page at /login; Supabase Auth validates; JWT carries tenant_id + role claim; redirect by role | Critical | 3 |
| US-03 | E-02 | As a super admin, I want to invite a school admin via email, so that new tenants can be onboarded without sharing passwords. | POST /invite generates token; email sent with link; user sets password on first login | Critical | 5 |
| US-04 | E-03 | As an admin, I want to set my school's name, logo, M-Pesa paybill, and term dates, so that the platform is configured for my school. | Settings page with branding, M-Pesa, academic year fields; saved to tenants table | Critical | 5 |
| US-05 | E-04 | As an admin, I want to import 200 students from a CSV, so that onboarding takes minutes not days. | CSV upload → validation → created+failed report; duplicates detected by admission_no | High | 8 |
| US-06 | E-04 | As an admin, I want to link a parent to a student, so that the parent can see attendance and pay fees. | Parent CRUD exists; guardians_link table maintained; ≤2 guardians per student | Critical | 5 |
| US-07 | E-06 | As an admin, I want to create a recurring remedial session, so that the timetable is generated automatically for the term. | Create session (day, time, room, teacher, group); server expands to occurrences; conflict check runs | Critical | 8 |
| US-08 | E-06 | As an admin, I want to see a calendar with all sessions, filtered by teacher/group/room, so that I can spot conflicts. | Calendar view (month/week/agenda); conflict indicators; click → session detail | High | 8 |
| US-09 | E-07 | As a teacher, I want to mark all students present with one tap then adjust individuals, so that I save time. | Roster pre-filled; "Mark all present" button; per-student dropdown; save updates attendance table | Critical | 3 |
| US-10 | E-07 | As a principal, I want to approve attendance, so that it becomes locked and trustworthy. | Approval queue; approve locks all attendance for that session; post-lock edits require reason | High | 5 |
| US-11 | E-07 | As a teacher, I want to mark attendance even without internet, so that I don't lose data in dead zones. | Offline queue in IndexedDB; flush on reconnect; optimistic UI with sync status | High | 8 |
| US-12 | E-09 | As a parent, I want to pay fees via M-Pesa STK Push from my phone, so that I don't visit the school. | "Pay now" → phone input → STK push → callback → invoice updated → SMS confirmation | Critical | 13 |
| US-13 | E-09 | As a bursar, I want auto-reconciled M-Pesa payments, so that I stop spending a day weekly on ledgers. | STK callback reconciles to invoice; ledger updates automatically; reconciliation report matches M-Pesa | Critical | 8 |
| US-14 | E-09 | As a bursar, I want to avoid double-crediting a payment (idempotency), so that ledgers stay accurate. | Same CheckoutRequestID → idempotent response; no double credit; idempotency-key header supported | Critical | 5 |
| US-15 | E-10 | As a parent, I want to see my child's attendance and timetable, so that I stay informed. | Parent login → dashboard showing linked students; attendance %, recent sessions | High | 5 |
| US-16 | E-15 | As a parent, I want an SMS when my child is absent, so that I can follow up immediately. | Absence mark → notification queued → SMS sent via Mobiwave API within 2 min | High | 5 |
| US-17 | E-15 | As a parent, I want to opt out of SMS by replying STOP, so that I control my communication preferences. | STOP received → opt_out flagged per phone; no further SMS sent; confirmation reply sent | Medium | 3 |
| US-18 | E-18 | As a bursar, I want automatic SMS reminders at 3/7/14 days past due, so that I don't chase manually. | Cron job checks invoices; sends SMS per tenant template; logged in notification history | High | 5 |
| US-19 | E-19 | As an admin, I want to configure my school's Daraja and SMS credentials, so that payments and SMS work for my school. | Credentials form → encrypt and store; "Test" button verifies; test_status shown; never returns secrets | Critical | 8 |
| US-20 | E-19 | As a super admin, I want to set platform-billing credentials, so that Mobiwave can bill tenants. Are NEVER used as tenant fallback. | Platform credentials CRUD; scope=platform, purpose=platform_billing; RLS restricts to super_admin | High | 3 |
| US-21 | E-17 | As a principal, I want to view the audit log, so that I can investigate disputes. | Audit log viewer (filterable); shows actor, action, entity, before/after, timestamp | High | 5 |
| US-22 | E-16 | As a bursar, I want to export a CSV of revenue vs attendance for the term, so that I can analyse programme effectiveness. | Report page → select type → async job → download link or email when ready | Medium | 5 |

---

## Step 6: Engineering Tasks (Partial — representative for highest-priority items)

Full task breakdown per sprint is in each Sprint Backlog section below. Here is the task breakdown pattern:

### TASK TEMPLATE

```
Task ID: T-XXX
Title: <brief title>
Description: <detailed description of what to build>
Owner Role: Frontend | Backend | Full-Stack | DevOps | QA
Estimated Effort: <hours>
Dependencies: T-XXX, T-YYY
Files Likely Affected: <file paths>
Database Changes: [Yes/No] — <details>
API Changes: [Yes/No] — <details>
Testing Requirements: <what to test>
Documentation Updates: <what doc to update>
Definition of Done: <checklist>
```

### Key Technical Tasks (Illustrative — highest-risk items)

**T-001** | Supabase Project Scaffold & RLS Foundation
- Owner: DevOps / Backend
- Effort: 4h
- Dependencies: None
- Files: `supabase/config.toml`, `supabase/migrations/20260712230000_core_tables.sql`
- DoD: Supabase local + remote linked; `supabase start` works; seed creates malingi-high tenant; RLS enabled on all base tables

**T-002** | CI/CD Pipeline Setup
- Owner: DevOps
- Effort: 6h
- Dependencies: T-001
- DoD: GitHub Actions workflow runs `lint → typecheck → test → build` on PR and push to main; Deployment to staging via SSH; Telegram/Slack notification

**T-100** | M-Pesa STK Push Edge Function
- Owner: Backend
- Effort: 16h (HIGHEST RISK — due to Daraja complexity)
- Dependencies: T-001 (DB), T-200 (credential service)
- Files: `supabase/functions/stk/index.ts`, `supabase/functions/_shared/cors.ts`
- DoD: STK push triggers Daraja endpoint; CheckoutRequestID stored; pending payment row created; error handling for timeout/invalid phone/network; idempotency via Idempotency-Key header

**T-101** | M-Pesa Callback Handler (reconciliation)
- Owner: Backend
- Effort: 16h
- Dependencies: T-100
- Files: `supabase/functions/mpesa-callback/index.ts`
- DoD: idempotent by CheckoutRequestID; payment status updated; invoice amount_paid trigger fires; parent SMS notification enqueued; bursar notified via Realtime

**T-200** | Credential Service (encrypt, store, resolve)
- Owner: Backend
- Effort: 12h
- Dependencies: T-001
- Files: `supabase/migrations/20260713000001_credentials.sql`, edge function `credentials-test/index.ts`
- DoD: Credential CRUD API; AES-256-GCM encryption via Vault KEK; `decrypt_credential()` SECURITY DEFINER; strict resolution (tenant school_send → sandbox → CREDS_NOT_FOUND, no owner fallback); test endpoint verifies against provider

**T-300** | Attendance Offline Queue (Service Worker + IndexedDB)
- Owner: Frontend
- Effort: 12h
- Dependencies: T-001 (DB scaffold)
- Files: `src/lib/offline-queue.ts`, `public/sw.js`, `src/lib/idb.ts`
- DoD: Attendance marks queued when navigator.onLine=false; flushed on reconnect; conflict handling on sync; user sees sync status indicator

**T-400** | Scheduling Conflict Detector
- Owner: Backend
- Effort: 8h
- Dependencies: T-001, T-003 (sessions table migration)
- Files: `supabase/functions/scheduler/index.ts` (new)
- DoD: Detects room double-book and teacher overlap; returns warnings array; override with reason stores audit entry; holiday calendar integration skips flagged dates

**T-500** | SMS Notification Engine
- Owner: Backend
- Effort: 16h
- Dependencies: T-001 (notifications table), T-200 (credential service for SMS token)
- Files: `supabase/functions/notify/index.ts`
- DoD: Event trigger (attendance, payment, invoice) → template render → dispatch via Mobiwave API → retry 3× exp backoff → DLQ → opt-out check before sending

---

## Step 7: Milestones

| Milestone | Name | Duration | Dependencies | Deliverable | Usable? |
|-----------|------|----------|-------------|-------------|---------|
| M0 | **Planning & Enablement** | 3 days | None | RLS-validated DB, CI/CD green, Supabase linked, dev env working, JWT auth scaffold. **Must pass before any code is written.** | Yes — infra is validated |
| M1 | **Auth & Tenant Foundation** | 5 days | M0 | Login/logout, MFA for admins, RLS on all tables, role guards, invite flow, first tenant seed | Yes — admin can log in |
| M2 | **Core Data Management** | 5 days | M1 | Student/Teacher/Subject CRUD, bulk import, parent linking, fee type CRUD, settings page | Yes — admin can populate the school |
| M3 | **Scheduling Engine** | 5 days | M2 | Session templates, recurrence expansion, calendar view, conflict detection, holiday calendar, session cancellation | Yes — timetable is live |
| M4 | **Attendance System** | 5 days | M3 | Session roster, mark/lock/approve, offline queue, attendance analytics | Yes — teachers can mark |
| M5 | **M-Pesa Payments** | 8 days | M2 (parallel after M2) | STK push, callback handler, reconciliation, ledger, waivers, reminders, credential management | Yes — fees can be collected |
| M6 | **Parent & Teacher Portals** | 5 days | M4, M5 | Parent: view attendance, timetable, pay fees; Teacher: timetable, mark attendance, upload notes | Yes — parents and teachers have dashboards |
| M7 | **Reporting & SMS Engine** | 5 days | M4, M5 (parallel after M4,M5) | SMS dispatch, templates, opt-out, revenue/attendance reports, CSV/PDF export, audit log viewer | Yes — management can export and SMS works |
| M8 | **Hardening & UAT** | 5 days | M6, M7 | QA pass, security scan, accessibility audit, performance baselines, Malingi UAT pilot, training materials | Yes — production-ready |
| M9 | **Go-Live & Handover** | 2 days | M8 | Production deploy, Malingi onboarding, data import, go-live verification, support channels | Yes — LIVE |

### Milestone Dependency Graph

```
M0 (Planning) ─── M1 (Auth/Tenant) ─── M2 (Core Data) ─── M3 (Scheduling) ─── M4 (Attendance) ─┐
                                            │                                                     │
                                            └──────── M5 (Payments) ──────────────────────────────┤
                                                                                                   │
                                                                                          M6 (Portals) ─── M7 (Reports/SMS) ─── M8 (UAT) ─── M9 (Go-Live)
```

**Key insight:** M5 (Payments) runs partially parallel with M3 (Scheduling). Both depend on M2. This shaves 3–4 days off the critical path.

---

## Step 8: Sprint Plan (2-Week Sprints)

### Sprint 1: Foundation & Auth (Days 1–10)

**Goal:** Working authentication, tenant isolation, and CI/CD pipeline. An admin can log in and see their dashboard.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S1-01 | Supabase project setup + config.toml | 2 | DevOps | — |
| S1-02 | Core migrations: tenants, profiles, user_roles, students, teachers, subjects, remedial_groups, sessions, attendance, fee_types, invoices, payments, waivers, notifications, audit_log, credentials | 6 | Backend | S1-01 |
| S1-03 | RLS policies on all tables + seed (malingi-high tenant) | 4 | Backend | S1-02 |
| S1-04 | Supabase Auth config (email auth, disable public signup, enable MFA TOTP) | 2 | Backend | S1-01 |
| S1-05 | Login page (`/login`) — email+password form, Supabase Auth integration | 6 | Frontend | S1-01, S1-04 |
| S1-06 | Role-based route guard (SvelteKit hooks + layout guard) — reads role claim, redirects | 4 | Frontend | S1-05 |
| S1-07 | Auth session management (refresh, httpOnly cookie, auto-redirect on expiry) | 4 | Frontend | S1-05 |
| S1-08 | Dashboard shell + role-scoped layouts (sidebar nav, top bar) | 6 | Frontend | S1-06 |
| S1-09 | CI/CD pipeline: GitHub Actions (lint → typecheck → test → build → deploy staging) | 6 | DevOps | S1-01 |
| S1-10 | Design token implementation (Tailwind config, color/font/spacing tokens) | 4 | Frontend | — |
| S1-11 | Shared UI components: Button, Card, Input, Toast, Modal | 8 | Frontend | S1-10 |
| S1-12 | Edge Function: health check (`/api/healthz`) | 2 | Backend | S1-01 |
| S1-13 | Cross-tenant RLS leak test (integration test) | 4 | QA | S1-03 |

**Deliverables:**
- Supabase local + staging linked with all schema migrations applied
- CI/CD pipeline green
- Admin can log in at `/login`, passed JWT RBAC, land on dashboard shell
- RLS verified: tenant A cannot see tenant B data
- Shared UI component library renderable

**Risks:**
- Supabase CLI incompatibility with project Deno version (S1-01)
- JWT claim mapping (custom claims for tenant_id + role) — requires careful Supabase config

**Definition of Done:**
- [x] All DB migrations applied cleanly
- [x] CI/CD passes lint + typecheck + test + build
- [x] Cross-tenant integration test passes
- [x] Login flow works end-to-end
- [x] Role-based redirect works for admin/teacher/parent (dummy users)
- [x] Error states: wrong password, expired session, network failure

**Retrospective Questions:**
1. Was Supabase Auth integration smooth or did we need workarounds?
2. Is the CI pipeline fast enough (< 5 min)?
3. Are any tables missing RLS policies?
4. Did the design tokens cause any friction in component development?

---

### Sprint 2: Core Data Management (Days 11–20)

**Goal:** Full CRUD for students, teachers, subjects, groups, fee types, and settings. Bulk import works.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S2-01 | Student CRUD pages (list, create, edit, deactivate) | 8 | Frontend | S1-08 |
| S2-02 | Teacher CRUD pages | 6 | Frontend | S1-08 |
| S2-03 | Subject + Remedial Group CRUD pages | 6 | Frontend | S1-08 |
| S2-04 | Fee type CRUD pages + auto-invoice generation | 6 | Frontend | S1-08 |
| S2-05 | Bulk CSV student import (upload → parse → validate → create → report) | 8 | Frontend+Backend | S2-01 |
| S2-06 | Parent CRUD + guardians_link management | 6 | Frontend+Backend | S2-01 |
| S2-07 | School settings page (branding, M-Pesa, term dates) | 4 | Frontend | S1-08 |
| S2-08 | Student/Teacher list API endpoints (PostgREST) with pagination, filter, sort | 4 | Backend | S1-01 |
| S2-09 | Bulk import validation (Zod schema, duplicate detection, failure report) | 6 | Backend | S2-05 |
| S2-10 | User management page (CRUD users within tenant, assign roles) | 6 | Frontend | S1-08 |
| S2-11 | Integration tests: CRUD operations, duplicate detection, RLS on all new tables | 6 | QA | S2-01–S2-10 |
| S2-12 | UI Data Table component (sort, filter, paginate, row actions) | 8 | Frontend | S1-11 |
| S2-13 | PWA service worker shell + manifest | 4 | Frontend | S1-01 |

**Deliverables:**
- Admin can manage students, teachers, subjects, groups, fee types, parents
- Bulk CSV import works with failure report
- Settings page configures school branding, M-Pesa, term dates
- PWA manifest ready (install prompt)
- All CRUD operations tested with RLS isolation

**Risks:**
- CSV import edge cases (character encoding, large files 200+ rows, duplicate detection)
- RLS on new tables missed in development rush

**Quality Gates:**
- Coverage ≥ 80% on services/lib
- No RLS leaks in integration tests
- UI renders correctly at 320px, 768px, 1280px
- CSV import: 200 rows complete in < 60s

---

### Sprint 3: Scheduling & Calendar (Days 21–30)

**Goal:** Recurring remedial sessions, working calendar with conflict detection, holiday integration.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S3-01 | Session template creation form (day, time, recurrence, room, teacher, group) | 8 | Frontend | S2-03 |
| S3-02 | Session expansion Edge Function (templates → occurrences for term) | 12 | Backend | S2-03 |
| S3-03 | Calendar component (month/week/agenda views, color-coded sessions) | 12 | Frontend | S1-11 |
| S3-04 | Calendar page with filters (teacher, group, room) | 6 | Frontend | S3-03 |
| S3-05 | Conflict detection algorithm (room double-book, teacher overlap) | 8 | Backend | S3-02 |
| S3-06 | Conflict override UI (admin: warning → override with reason) | 4 | Frontend | S3-05 |
| S3-07 | Holiday calendar CRUD + integration with scheduler | 6 | Frontend+Backend | S2-07 |
| S3-08 | Session cancellation (admin/teacher request → notification trigger) | 4 | Frontend+Backend | S3-02 |
| S3-09 | Calendar occurrence → session detail drawer (roster preview) | 6 | Frontend | S3-03 |
| S3-10 | Integration tests: schedule creation, conflict detection, override | 6 | QA | S3-01–S3-09 |

**Deliverables:**
- Admin can create session templates → occurrences auto-expanded for term
- Calendar shows all sessions with color coding by subject
- Conflict detection warns on room/teacher double-book; admin can override with reason
- Holiday calendar prevents scheduling on flagged dates
- Session cancellation creates notification event

**Risks:**
- Recurrence expansion edge cases (term boundaries, week vs day precision)
- Conflict detector performance with 1000+ sessions/term
- Calendar component performance with 500+ events (virtual list required)

---

### Sprint 4: Attendance (Days 31–40)

**Goal:** Teachers mark attendance, principal approves/locks, analytics viewable.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S4-01 | Session roster generation (pre-filled student list per occurrence) | 6 | Backend | S3-02 |
| S4-02 | Attendance marking UI (mark all present + per-student override) | 10 | Frontend | S4-01 |
| S4-03 | Attendance save API (bulk upsert, sets marked_at) | 6 | Backend | S4-01 |
| S4-04 | Attendance lock (principal approval UI, queue) | 6 | Frontend | S4-02 |
| S4-05 | 24-hour auto-lock cron job (background) | 4 | Backend | S4-03 |
| S4-06 | Post-lock edit form (reason required, audit trail) | 4 | Frontend+Backend | S4-04 |
| S4-07 | Offline attendance queue (IndexedDB + service worker) | 12 | Frontend | S4-02 |
| S4-08 | Attendance analytics (rate per student/group/teacher, trends chart) | 8 | Frontend+Backend | S4-01 |
| S4-09 | Chronic absence flag (configurable threshold) | 4 | Backend | S4-08 |
| S4-10 | Teacher portal: Today's timetable → attendance marking shortcut | 6 | Frontend | S4-02, S3-03 |
| S4-11 | Integration tests: attendance CRUD, lock, offline queue, analytics | 8 | QA | S4-01–S4-10 |

**Deliverables:**
- Teacher opens session → roster pre-filled → marks present/late/absent → saved
- Principal approves → attendance locked → edits require reason
- 24h auto-lock runs as cron
- Attendance analytics with charts (per student, group, teacher)
- Offline queue stores marks when disconnected, flushes on reconnect
- Teacher portal attendance shortcut

**Risks:**
- Offline queue sync conflicts (teacher marks offline, principal locks online while offline)
- 24h lock cron misses sessions due to timezone issues (EAT vs UTC)
- UI responsiveness on 40-student roster on low-end phones

---

### Sprint 5: Payments & M-Pesa (Days 31–44) — **OVERLAPS WITH SPRINT 4**

> ⚠️ **This is the highest-risk sprint.** Start as early as Sprint 2 completion. Do NOT wait for Sprint 4.

**Goal:** Full M-Pesa STK Push flow working end-to-end: trigger → callback → reconciliation → ledger update → parent SMS.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S5-01 | Credential management UI (admin: add Daraja + SMS creds, test, activate) | 8 | Frontend | S2-07 |
| S5-02 | Credential CRUD API + encryption (Vault KEK, AES-256-GCM) | 12 | Backend | S2-01 |
| S5-03 | Credential test Edge Function (verify Daraja OAuth + /balance) | 8 | Backend | S5-02 |
| S5-04 | STK Push Edge Function (Daraja OAuth → build request → send → store pending) | 16 | Backend | S5-02 |
| S5-05 | M-Pesa callback handler (reconcile, idempotent, notify) | 16 | Backend | S5-04 |
| S5-06 | Payment ledger page (per-student history) | 6 | Frontend | S5-04 |
| S5-07 | Waiver button + form (amount, reason, audited) | 4 | Frontend+Backend | S2-04 |
| S5-08 | Invoice balance trigger (automatically update amount_paid on payment insert) | 4 | Backend | S1-02 |
| S5-09 | Idempotency key handling on payment endpoints | 4 | Backend | S5-04 |
| S5-10 | Payment timeout handling (retry once, then "awaiting" status) | 4 | Backend | S5-04 |
| S5-11 | Daraja mock server (for integration testing without real sandbox) | 8 | QA | S5-04 |
| S5-12 | Payment E2E test (stub M-Pesa → callback → reconciliation) | 8 | QA | S5-04, S5-05, S5-11 |

**Deliverables:**
- Admin configures Daraja credentials → "Test" button verifies
- "Pay now" on invoice → STK Push to parent phone → callback reconciles → invoice updates → SMS confirmation
- Idempotent payments: duplicate callbacks don't double-credit
- Waiver flow works with audit trail
- Ledger view shows full transaction history
- Payment timeout handling: retries once, then marks awaiting

**Risks:**
- ⚠️ Daraja sandbox is unreliable. Callbacks may not arrive. Have a manual reconcile fallback.
- ⚠️ Daraja STK callbacks are NOT signed (no HMAC). Security relies on CheckoutRequestID uniqueness + state machine (pending→completed) + FOR UPDATE invoice lock.
- ⚠️ Credential encryption misconfiguration could leak secrets.
- ⚠️ STK Push timeout (60-120s) must not block the UI. Use polling or Realtime subscription.

---

### Sprint 6: Portals & SMS (Days 41–52)

**Goal:** Parent and teacher portals fully functional, SMS engine live, basic reports working.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S6-01 | Parent portal: attendance view (per linked student) | 6 | Frontend | S4-08, S2-06 |
| S6-02 | Parent portal: timetable view | 4 | Frontend | S3-03, S2-06 |
| S6-03 | Parent portal: fees + "Pay now" STK trigger | 6 | Frontend | S5-04, S2-04 |
| S6-04 | Parent portal: announcements | 4 | Frontend | S1-08 |
| S6-05 | Parent portal: EN/SW toggle | 4 | Frontend | S1-10 |
| S6-06 | Teacher portal: timetable view (role-scoped) | 4 | Frontend | S3-03 |
| S6-07 | Teacher portal: attendance marking from timetable | 6 | Frontend | S4-02, S4-10 |
| S6-08 | Teacher portal: notes upload (Supabase Storage) | 6 | Frontend+Backend | S1-01 |
| S6-09 | SMS engine: Mobiwave API integration (send, balance, campaign) | 8 | Backend | S5-02 (SMS credential) |
| S6-10 | Event → SMS trigger: absence, payment, invoice, reminder | 8 | Backend | S6-09, S4-03, S5-05 |
| S6-11 | SMS template library (per-tenant, EN/SW) | 6 | Backend | S6-09 |
| S6-12 | SMS opt-out handling (STOP → store → skip) | 4 | Backend | S6-10 |
| S6-13 | Revenue report page (collected/owing, by fee/term) | 8 | Frontend | S2-04, S5-04 |
| S6-14 | Attendance report page (rate by student/group/teacher) | 6 | Frontend | S4-08 |
| S6-15 | CSV/PDF export (async job: generate → store → download link) | 8 | Backend | S6-13 |
| S6-16 | Audit log viewer page (filterable, paginated) | 6 | Frontend | S1-02 |
| S6-17 | Super admin: tenant onboarding flow (create tenant, seed initial data) | 6 | Frontend+Backend | S1-08 |
| S6-18 | Super admin: per-tenant usage dashboard (users, payments, SMS volume) | 8 | Frontend+Backend | S6-09, S5-04 |
| S6-19 | Payment aging + 3/7/14-day auto-reminder cron | 6 | Backend | S6-10, S5-04 |
| S6-20 | Integration + E2E tests: portals, SMS, reports, audit | 10 | QA | S6-01–S6-19 |

**Deliverables:**
- Parent logs in → sees children's attendance, timetable, fees → can pay via STK
- Teacher logs in → sees timetable → marks attendance → uploads notes
- SMS sent on absence, payment confirmation, invoice, payment reminders
- SMS opt-out respected
- Revenue and attendance reports with CSV/PDF export
- Audit log viewer operational
- Super admin can onboard new tenants
- Auto-reminders at 3/7/14 days past due

**Risks:**
- SMS costs not tracked (need to add SMS usage counter)
- Parent portal mobile responsiveness (critical for low-end phones)
- Report query performance with real data volumes
- EN/SW i18n coverage gaps

---

### Sprint 7: Hardening & UAT (Days 53–65)

**Goal:** System is production-ready. UAT pilot at Malingi. All quality gates passed.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S7-01 | Performance benchmark (k6): STK endpoint, dashboard, report export | 8 | QA | All |
| S7-02 | Security audit: OWASP ZAP scan, dependency audit, RLS leak confirm | 8 | QA | All |
| S7-03 | Accessibility audit: axe-core + Lighthouse (WCAG AA) + screen reader pass | 8 | QA | All |
| S7-04 | Playwright E2E test suite (all core flows) | 16 | QA | All |
| S7-05 | Error boundary hardening (global error pages, Sentry integration) | 4 | Frontend | All |
| S7-06 | Rate limiting (per-tenant, per-user, per-phone enforcement) | 6 | Backend | All |
| S7-07 | M-Pesa callback retry + alerting (if callback fails, alert admin) | 4 | Backend | S5-05 |
| S7-08 | UAT pilot at Malingi (3 teachers, 10 parents, 1 bursar) | 3 days | Product | All |
| S7-09 | Bug fixes from UAT (prioritized) | 16 | All | S7-08 |
| S7-10 | User training materials (teacher quick start, parent SMS guide) | 8 | Product | All |
| S7-11 | Production environment provisioning (EVO VPS, Supabase prod project) | 8 | DevOps | All |
| S7-12 | Production data seed (Malingi student/teacher/parent import) | 4 | Backend | S7-11 |
| S7-13 | Load test: 50 concurrent users, 100 simultaneous STK pushes | 6 | QA | S7-01 |
| S7-14 | Documentation final review + update CHANGELOG | 4 | All | All |

**Deliverables:**
- All quality gates pass (see Step 17)
- UAT feedback incorporated and bugs fixed
- Production infra provisioned and verified
- Training materials delivered
- Load test passes with acceptable metrics

**Risks:**
- UAT reveals critical bugs that block go-live (build in 3-day buffer)
- Malingi users may not have time for UAT (term schedule alignment)
- Accessibility issues may require significant rework if caught late
- Load test fails: poor query performance under realistic data volumes

---

### Sprint 8: Go-Live & Handover (Days 66–70)

**Goal:** Production deployment, Malingi onboarding, go-live verified.

**Tasks:**

| ID | Task | Effort (h) | Owner | Dep |
|----|------|-----------|-------|-----|
| S8-01 | Production deploy: Supabase prod + latest migrations | 4 | DevOps | S7-11 |
| S8-02 | Production deploy: SvelteKit to Vercel | 4 | DevOps | S7-11 |
| S8-03 | Edge Function deploy (stk, mpesa-callback, notify, credentials-test) | 2 | DevOps | S7-11 |
| S8-04 | DNS + SSL config (app.reclass.mobiwave.ke) | 2 | DevOps | S7-11 |
| S8-05 | Uptime monitoring (UptimeRobot) + Sentry production project | 2 | DevOps | S8-01 |
| S8-06 | M-Pesa production credentials setup + test (Malingi paybill) | 4 | Backend | S5-02 |
| S8-07 | Mobiwave SMS sender ID registration + test | 2 | Backend | S6-09 |
| S8-08 | Malingi data import (students, teachers, parents) | 4 | Backend | S8-01 |
| S8-09 | Go-live smoke test (attend session → mark → lock → payment → SMS) | 4 | QA + Product | S8-01–S8-07 |
| S8-10 | Rollback plan validation (restore from backup) | 2 | DevOps | S8-01 |
| S8-11 | Administrator handover (passwords, URLs, runbooks, support contacts) | 4 | Product | S8-09 |

**Deliverables:**
- Production environment live at `app.reclass.mobiwave.ke`
- Malingi data loaded
- M-Pesa live credentials configured and tested
- SMS working with registered sender ID
- All monitoring and alerting active
- Rollback runbook validated
- Handover docs delivered to Malingi admin and Mobiwave super admin

**Risks:**
- DNS propagation delays
- M-Pesa production credentials (Safaricom approval takes 1–2 weeks — START EARLY)
- Last-minute data import issues (phone number formatting, duplicates)

---

## Step 9: Dependency Graph

### 9.1 Feature Dependencies

```
E-01 (Foundation) ─── NO DEPS (start here)
    │
    ├── E-02 (Auth) ─── DEP: E-01
    │
    ├── E-03 (Tenants) ─── DEP: E-02
    │
    ├── E-04 (Students/Parents) ─── DEP: E-03
    │
    ├── E-05 (Teachers/Subjects) ─── DEP: E-03
    │
    ├── E-19 (Credentials) ─── DEP: E-03
    │   │
    │   ├── E-09 (Payments) ─── DEP: E-19, E-04 (for invoices)
    │   │
    │   └── E-15 (SMS Engine) ─── DEP: E-19
    │
    ├── E-06 (Scheduling) ─── DEP: E-04, E-05
    │   │
    │   ├── E-07 (Attendance) ─── DEP: E-06, E-04
    │   │
    │   ├── E-11 (Teacher Portal) ─── DEP: E-06, E-07
    │   │
    │   └── E-12 (Principal Dashboard) ─── DEP: E-07
    │
    ├── E-10 (Parent Portal) ─── DEP: E-07 (attendance view), E-09 (pay fees)
    │
    ├── E-13 (Bursar Dashboard) ─── DEP: E-08 (fees), E-09 (payments)
    │
    ├── E-08 (Fees/Invoicing) ─── DEP: E-04
    │
    ├── E-16 (Reports) ─── DEP: E-07 (attendance data), E-09 (payment data)
    │
    ├── E-17 (Audit) ─── DEP: E-01 (core audit_log table from day 1)
    │
    ├── E-18 (Aging/Reminders) ─── DEP: E-09 (payment data), E-15 (SMS)
    │
    └── E-14 (Super Admin Console) ─── DEP: E-03, E-09, E-15 (usage data aggregation)
```

### 9.2 Critical Blockers (highlighted)

| Blocker | Type | Blocks | Reason | Mitigation |
|---------|------|--------|--------|------------|
| **M-Pesa production credentials** | External | Go-Live | Safaricom approval takes 1-2 weeks | Apply for production Daraja credentials IMMEDIATELY after Sprint 2. Do not wait. |
| **Mobiwave SMS sender ID** | External | SMS Engine | Sender ID registration required before SMS can be sent | Register sender ID in week 1. Use generic sender if school-specific not ready. |
| **Supabase Vault KEK** | Technical | Credential Encryption | KEK must be configured before credential CRUD works | Document in Sprint 1. Vault config is a one-time setup. |
| **RLS on every table** | Technical | Everything | Missing RLS = data leak | Add RLS test to CI in Sprint 1. Every migration MUST include RLS policy. |

### 9.3 Recommended Implementation Order for Minimal Blocking

```
WEEK 1:  E-01 → E-02 (foundation + auth)
WEEK 2:  E-03 → E-04 (tenants + students) + START M-Pesa sandbox exploration
WEEK 3:  E-05 + E-19 (teachers/credentials) || E-08 (fees)
WEEK 4:  E-06 (scheduling) || E-09 (payments) — PARALLEL
WEEK 5:  E-07 (attendance) — depends on E-06
WEEK 6:  E-10 + E-11 (portals) — depends on E-07, E-09
WEEK 7:  E-15 + E-16 (SMS + reports) — depends on E-07, E-09
WEEK 8:  E-12 + E-13 (principal + bursar dashboards)
WEEK 9:  E-14 + E-17 + E-18 (super admin, audit, reminders)
WEEK 10: Hardening + UAT
```

---

## Step 10: Testing Plan

### 10.1 Per-Sprint Testing Map

| Sprint | Unit | Integration | E2E | A11y | Perf | Security | Notes |
|--------|------|-------------|-----|------|------|----------|-------|
| S1 | Auth functions, middleware | RLS leak test, auth flow | — | — | — | Auth lockout, MFA | Foundation verification |
| S2 | CRUD services, CSV parser | CRUD + RLS on all new tables | CSV import | — | — | — |
| S3 | Conflict detection algorithm | Schedule expansion, conflict detect | Schedule + conflict | — | — | — |
| S4 | Attendance service, lock/approve logic | Offline queue sync | Attendance full flow | Teacher portal | — | — |
| S5 | STK logic, reconciliation math | Daraja mock → STK + callback | Payment happy/sad paths | — | STK endpoint | Credential encryption | HIGHEST RISK |
| S6 | SMS engine, report queries, i18n | SMS dispatch, report generation | Parent/teacher portals, SMS | Parent portal | — | SMS opt-out |
| S7 | All services (final sweep) | Full regression, cross-tenant | All core flows | WCAG AA audit | k6 benchmark | OWASP ZAP scan | HARDENING |
| S8 | Go-live smoke tests | Production verification | Production E2E | — | Load test (50 users) | Production scan | Go-live |

### 10.2 Key Test Cases (from testing.md — expanded)

| TC ID | Type | Description | Sprint | Priority |
|-------|------|-------------|--------|----------|
| TC-RLS-01 | Integration | Tenant A user queries returns zero rows for Tenant B | S1 | **BLOCKER** |
| TC-AUTH-01 | Integration | 5 failed logins → lockout + CAPTCHA | S1 | High |
| TC-PAY-01 | E2E | STK success → invoice paid, ledger + receipt, SMS confirmation | S5 | **CRITICAL** |
| TC-PAY-02 | Integration | Amount > balance → 422 OVERPAYMENT | S5 | High |
| TC-PAY-03 | Integration | Duplicate callback → no double credit | S5 | **CRITICAL** |
| TC-ATT-01 | Integration | Teacher marks present → saved; after lock → 409 without reason | S4 | High |
| TC-ATT-02 | Integration | Absent → notification queued; parent receives SMS | S6 | High |
| TC-SCHED-01 | Integration | Double-book → warning; override with reason → stored | S3 | Medium |
| TC-CRED-01 | Integration | Tenant admin saves Daraja creds → encrypted; list never returns blob | S5 | **CRITICAL** |
| TC-CRED-02 | Integration | resolve(tenant, mpesa) returns tenant school_send → sandbox → CREDS_NOT_FOUND. NOT owner fallback | S5 | **CRITICAL** |
| TC-CRED-03 | Integration | Non-super_admin cannot read scope=platform creds (403) | S5 | High |
| TC-SEC-01 | Security | decrypt_credential() never invoked in client context | S5 | High |
| TC-OFFLINE-01 | Integration | Attendance marked offline → queued → flushed on reconnect → synced | S4 | High |
| TC-EXPORT-01 | Integration | Revenue report CSV export format matches spec | S6 | Medium |

### 10.3 Test Environment Strategy

| Environment | Purpose | Data | Tools |
|-------------|---------|------|-------|
| **Local Dev** | Unit + integration tests during development | Faker-generated, Supabase local | Vitest, Playwright |
| **CI (GitHub Actions)** | PR gate: unit + integration + lint | Faker + seed data | Vitest, Supabase CLI |
| **Staging** | E2E nightly, performance, security, UAT | Production-like (anonymized PII) | Playwright, k6, OWASP ZAP |
| **Production** | Smoke tests on deploy | Real data (actual queries) | Playwright (smoke) |

### 10.4 Coverage Targets

| Layer | Target | Method |
|-------|--------|--------|
| Services (lib/) | ≥ 80% | Vitest coverage |
| Edge Functions | ≥ 70% | Vitest + supabase-mock |
| UI components | ≥ 60% | Vitest + testing-library |
| E2E critical paths | 100% of Must-Have flows | Playwright |
| RLS policies | Every table tested for leak | Integration test per table |
| Accessibility | WCAG 2.1 AA | axe-core + Lighthouse CI |

---

## Step 11: Git Strategy

### 11.1 Branching Model: **Trunk-Based Development (with short-lived feature branches)**

```
main ────────────────┬────────────────┬──────────────────┬─────────────────►
                     │                │                  │
                     feat/attendance  feat/mpesa-stk     feat/sms-engine
                     │                │                  │
                     └───────┐        └───────┐          └───────┐
                              v                v                  v
                             Merge          Merge              Merge
```

- `main` — always deployable. All commits to main pass CI.
- `feat/<name>` — short-lived (max 3 days). Branch from main, merge back via PR.
- `fix/<name>` — bug fix branches. Same lifecycle.
- `release/<version>` — from main at release points. Hotfixes can branch from here.
- No `develop` branch — trunk-based reduces merge complexity for a small team.

### 11.2 Release Strategy

| Phase | Branch | Deploy Method |
|-------|--------|---------------|
| Daily dev | `main` | Auto-deploy staging |
| Release candidate | `main` at tag | Manual deploy to staging → UAT |
| Production | `main` at tag | Manual deploy after UAT approval |

### 11.3 Versioning: **Semantic Versioning** (`v<major>.<minor>.<patch>`)

- v0.1.0 — Sprint 1 internal
- v0.2.0 — Sprint 2 internal
- ... incremental through sprints
- v1.0.0 — Production launch
- v1.1.0 — Phase 2 features
- v2.0.0 — Major feature release (QR, AI, etc.)

### 11.4 Tagging Convention

- `v1.0.0-alpha1` — Alpha builds
- `v1.0.0-beta1` — Beta builds
- `v1.0.0-rc1` — Release candidates
- `v1.0.0` — Production releases
- `v1.0.1` — Patch hotfixes

### 11.5 Commit Conventions: **Conventional Commits**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `db`

Examples:
```
feat(attendance): add session roster pre-fill
fix(payments): resolve STK callback timeout handling
db(credentials): add encrypted_blob column
test(auth): add RLS cross-tenant leak test
```

### 11.6 Pull Request Workflow

1. Developer creates branch from `main`
2. Commits with conventional commit messages
3. PR title matches commit convention
4. CI runs: `lint → typecheck → test (unit + integration) → build → deploy-preview`
5. PR checklist:
   - [ ] Code compiles
   - [ ] Tests pass (including RLS leak test)
   - [ ] No new lint/type errors
   - [ ] Migration is backward-compatible
   - [ ] RLS policy added for new tables
   - [ ] Audit log covered for mutating actions
   - [ ] API changes documented in api.md
6. **Review requirement:** At least 1 approval (or AI agent review)
7. Merge via **Squash Merge** (clean main history)
8. Delete branch

### 11.7 Merge Requirements

- ✅ CI passes
- ✅ Code reviewed
- ✅ No merge conflicts
- ✅ Coverage not decreased
- ✅ Migration is forward-only (no destructive changes)

### 11.8 PR Checklist (automated via PR template)

```markdown
## Description
_What does this PR do?_

## Type
- [ ] feat
- [ ] fix
- [ ] db (migration)
- [ ] test
- [ ] docs
- [ ] refactor

## Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] RLS leak test
- [ ] E2E (if applicable)

## Documentation
- [ ] API docs updated
- [ ] Database docs updated
- [ ] CHANGELOG updated

## Security
- [ ] No secrets committed
- [ ] RLS policy added (if new table)
- [ ] Audit log covered (if mutating action)
```

---

## Step 12: CI/CD Plan

### 12.1 Pipeline Architecture

```
[Developer Push]
       │
       ▼
[GitHub Actions]
       │
       ├── Lint (ESLint + Prettier check)
       ├── TypeCheck (tsc --noEmit)
       ├── Unit Tests (Vitest, coverage ≥ 80%)
       ├── Integration Tests (Supabase local)
       ├── RLS Leak Test (critical gate)
       ├── Build (next build)
       ├── Security (npm audit + dependency review)
       └── Deploy
              ├── Staging (auto on main merge)
              └── Production (manual trigger on tag)
```

### 12.2 Build Pipeline

| Stage | Tool | Cache | Time Budget |
|-------|------|-------|-------------|
| Install | `npm ci` | `~/.npm` | 2 min |
| Lint | `next lint` + `prettier --check` | — | 1 min |
| TypeCheck | `tsc --noEmit` | — | 1 min |
| Unit Tests | `vitest run --coverage` | Vitest cache | 2 min |
| Integration | `supabase start` → `vitest run integration` | Supabase | 4 min |
| Build | `next build` | `.next` cache | 3 min |
| Security | `npm audit` + `ossls audit` | — | 1 min |
| **Total** | | | **~14 min** |

### 12.3 Security Scans

- **npm audit** — every PR. Fail on critical/high.
- **Dependabot** — weekly; auto-PR for patches.
- **OSS Review Toolkit** — monthly license + security scan.
- **OWASP ZAP** — nightly on staging.
- **Secret scanning** — git hooks + GitHub push protection.

### 12.4 Linting & Formatting

| Tool | Scope | Enforced |
|------|-------|----------|
| ESLint | `src/`, `supabase/functions/` | CI gate |
| Prettier | All TypeScript/JSON/MD | CI gate (check mode) |
| TypeScript strict | All `.ts`/`.tsx` | CI gate (`tsc --noEmit`) |

### 12.5 Deployment Approvals

| Env | Trigger | Approver | Method |
|-----|---------|----------|--------|
| Dev | Manual `npm run dev` | Developer | Local |
| Staging | Push to `main` (auto) | CI pass | `rsync` via SSH |
| Staging (migrations) | Push with migration | CI + review | `supabase db push` |
| Production | Git tag `v*.*.*` | Manual approval (Mobiwave lead) | `rsync` + `supabase db push` |
| Production (hotfix) | `fix/` from release branch | Lead + principal | Cherry-pick + deploy |

### 12.6 Rollback Strategy

| Scenario | Method | RTO |
|----------|--------|-----|
| Buggy code deploy | Revert commit → deploy previous image | 15 min |
| Bad migration | Drop-fwd (new migration to fix) | 30 min |
| Data corruption | PITR restore (Supabase) | 4h |
| Full outage | Restore from VPS snapshot + DB backup | 4h |

**Rollback runbook** (see `docs/deployment.md` for full):
```
1. Identify the offending deploy (check Sentry + timing)
2. Revert the git commit on main
3. Re-run CI (which deploys the reverted code to staging first)
4. For prod: `git revert <hash>` → CI → tag → manual approve → deploy
5. For DB: write a forward migration that undoes the schema change
6. Verify: smoke test all critical paths
```

### 12.7 Environment Promotion

```
Dev (local) ──► Staging (auto) ──► Staging UAT (tag) ──► Production (manual approve)
     │                │                      │                     │
     │                ▼                      ▼                     ▼
   Env vars        .env.staging          .env.staging          .env.production
  Supabase local   Supabase staging      Supabase staging      Supabase prod
  Mock M-Pesa      Sandbox M-Pesa        Sandbox M-Pesa        Prod M-Pesa (REAL)
  Mock SMS         Sandbox SMS           Sandbox SMS           Prod SMS (REAL)
```

---

## Step 13: Risk Register

### 13.1 Risk Matrix

| ID | Risk Category | Description | Likelihood | Impact | Score | Mitigation | Owner |
|----|--------------|-------------|-----------|--------|-------|------------|-------|
| R-01 | **Technical** | M-Pesa sandbox ≠ production behaviour (callback timing, error codes differ) | High (8) | Critical (9) | **72** | Daraja mock server for testing; prod UAT with real sandbox; manual reconcile fallback | Backend Lead |
| R-02 | **Security** | RLS misconfiguration leaks tenant data | Medium (5) | Critical (10) | **50** | CI gate leak test per table; code review checklist; quarterly RLS audit | Backend + QA |
| R-03 | **Operational** | Teacher adoption failure (won't use the system) | Medium (5) | High (8) | **40** | Training session; simple UX; offline mode; paper backup | Product Owner |
| R-04 | **Technical** | Supabase Vault KEK configuration error blocks credential encryption | Medium (4) | High (8) | **32** | Document KEK setup in Sprint 1; test encrypt/decrypt in CI | DevOps |
| R-05 | **External** | Safaricom M-Pesa service outage | Low (3) | High (8) | **24** | Queue payments; display "service unavailable" status; SMS fallback to manual | Backend |
| R-06 | **Business** | Timeline overrun (6 weeks not enough) | High (7) | Medium (6) | **42** | Trim Phase 1 scope; parallelise M-Pesa with scheduling; add buffer week | EM |
| R-07 | **Security** | Student PII exposure (minors) under Data Protection Act | Low (3) | Critical (10) | **30** | Data minimisation; consent storage; encryption; purge jobs; DPA review | Security Lead |
| R-08 | **Infrastructure** | EVO VPS goes down | Low (2) | High (7) | **14** | Health checks; auto-restart (PM2/systemd); migration path to Docker/K8s | DevOps |
| R-09 | **Technical** | M-Pesa double-credit (duplicate callback) | Medium (4) | Critical (9) | **36** | CheckoutRequestID UNIQUE constraint; idempotency service | Backend |
| R-10 | **Operational** | SMS opt-out compliance failure (STOP not handled) | Medium (4) | High (7) | **28** | Automated STOP handler; opt-out stored per phone; legal review | Backend + Legal |
| R-11 | **Technical** | Offline queue data loss on flush failure | Medium (4) | Medium (6) | **24** | Keep queued items until server confirms; retry with backoff; alert on stuck queue | Frontend |
| R-12 | **External** | M-Pesa production credentials approval delay (Safaricom) | High (7) | High (7) | **49** | Apply in Sprint 1; use sandbox for all dev; manual reconcile as fallback | DevOps |
| R-13 | **Data** | DB query performance degrades with real data (100k+ rows) | Medium (5) | Medium (6) | **30** | Materialized views; index tuning; query monitoring; Redis in Phase 2 | Backend |
| R-14 | **Business** | Malingi term starts before system is ready | Medium (5) | High (8) | **40** | Align release with school calendar; ship MVP subset if needed | Product Owner |
| R-15 | **Technical** | Credential encryption key loss = no M-Pesa/SMS ability | Low (2) | Critical (9) | **18** | KEK backup in Supabase Vault; export encrypted backup of creds | DevOps |

### 13.2 Top 5 Risks (by score)

1. **R-01 — M-Pesa sandbox/prod gap (72)** — Mitigate with Daraja mock + prod UAT
2. **R-02 — RLS leak (50)** — Mitigate with CI leak test gate
3. **R-12 — M-Pesa production credentials delay (49)** — Apply in Sprint 1
4. **R-06 — Timeline overrun (42)** — Scope trim + parallel execution
5. **R-03 — Teacher adoption (40)** — Training + offline + simple UX

---

## Step 14: Resource Planning

### 14.1 Effort Estimate by Role

| Role | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 | Sprint 6 | Sprint 7 | Sprint 8 | **Total** |
|------|----------|----------|----------|----------|----------|----------|----------|----------|-----------|
| **Frontend** | 28h | 54h | 36h | 32h | 14h | 44h | 4h | — | **212h** |
| **Backend** | 18h | 18h | 36h | 26h | 60h | 40h | 10h | 10h | **218h** |
| **DevOps** | 8h | — | — | — | — | — | 8h | 8h | **24h** |
| **QA** | 4h | 6h | 6h | 8h | 16h | 10h | 32h | 4h | **86h** |
| **Product** | — | — | — | — | — | — | 24h | 24h | **48h** |
| **Total** | **58h** | **78h** | **78h** | **66h** | **90h** | **94h** | **78h** | **46h** | **588h** |

**Note:** Hours are development effort per person. Actual calendar time depends on team size and parallelisation.

### 14.2 Single Developer (Optimal Task Order)

If one developer builds everything, the order is:

```
1.  Foundation: Supabase project, CI/CD, DB migrations, RLS (week 1)
2.  Auth: Login, RBAC, session management (week 1-2)
3.  UI scaffold + design tokens + shared components (week 2)
4.  Core CRUD: Students, teachers, subjects, groups, fee types (week 3)
5.  Bulk import + parent linking (week 3-4)
6.  Credential management + encryption (week 4 — start M-Pesa sandbox exploration)
7.  Scheduling + conflict detection + calendar (week 5)
8.  M-Pesa STK + callback + reconciliation (week 5-6 — OVERLAP with scheduling)
9.  Attendance: roster, marking, lock, approve, offline queue (week 6-7)
10. Parent portal + Teacher portal (week 7-8)
11. SMS engine + reports + audit viewer (week 8-9)
12. Hardening: tests, security, a11y, performance (week 9-10)
13. UAT + fixes + go-live (week 10-11)
```

**Total: ~11 weeks for solo developer.** The 6-week Malingi timeline requires at least 2 developers.

### 14.3 Multiple Developers (Parallel Work)

| Developer | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 | Sprint 6 | Sprint 7 | Sprint 8 |
|-----------|----------|----------|----------|----------|----------|----------|----------|----------|
| **Dev A (Frontend)** | Login, dashboard shell, UI components | Student/Teacher CRUD, settings, bulk import UI | Calendar, session form, conflict override UI | Attendance UI, offline queue, teacher portal | Credentials UI, parent portal fee pay | Parent/teacher portals, reports UI, audit viewer | Error boundaries, E2E tests | Prod verification |
| **Dev B (Backend)** | DB migrations, RLS, Supabase Auth config, CI/CD | CSV import API, parent linking API, PostgREST setup | Session expansion engine, conflict detector, holiday API | Attendance API, lock cron, analytics | STK Edge Function, callback handler, cred encryption, waivers | SMS engine, templates, opt-out, report queries, export | Rate limiting, callback retry, M-Pesa alerting | Prod deployment, data import, smoke test |
| **Dev C (QA/DevOps)** | RLS leak test, CI pipeline, auth tests | Integration tests CRUD, Supabase Vault setup | Schedule integration tests | Attendance integration tests, offline sync test | Daraja mock server, payment E2E, cred tests | Portal E2E, SMS tests, report tests | Perf benchmark, security scan, a11y audit, full E2E | Load test, production smoke test |
| **Dev D (2nd Frontend, if available)** | — | Data table component, PWA manifest | Chart/calendar components | Attendance analytics charts, PDF export prep | Payment ledger, waiver UI | Super admin console, tenant dashboard, aging report | Accessibility pass, i18n EN/SW sweep | Training materials, documentation |

**With 2 developers (A + B):** 8-9 weeks (week 5-8 parallelised)
**With 3 developers (A + B + C):** 7-8 weeks
**With 4 developers (A + B + C + D):** 6-7 weeks

### 14.4 Parallelisation Opportunities

| Parallel Tracks | Dependency | When |
|-----------------|------------|------|
| **Track A:** Frontend UI components + design tokens | None | Sprint 1-2 |
| **Track B:** Backend DB + RLS + Auth | None | Sprint 1 |
| **Track A:** Scheduling UI | E-04, E-05 done (Sprint 2) | Sprint 3 |
| **Track B:** M-Pesa integration | E-19 done (Sprint 2/3) | **Sprint 3-5 (parallel with scheduling)** |
| **Track A:** Attendance + offline queue | E-06 done (Sprint 3) | Sprint 4-5 |
| **Track B:** SMS engine | E-19 done (Sprint 3) | Sprint 5-6 |
| **Track A:** Parent portal | E-07 + E-09 done (Sprint 5) | Sprint 6 |
| **Track B:** Reports + audit | E-07 + E-09 done (Sprint 5) | Sprint 6-7 |

---

## Step 15: Backlogs

### 15.1 Product Backlog (Must-Have for Malingi MVP)

All Epic E-01 through E-19 Must-Have features (see Step 4). Total: ~85 feature-level items.

### 15.2 Sprint Backlog

| Sprint | Items | Total SP | Status |
|--------|-------|----------|--------|
| S1 (Foundation + Auth) | S1-01 through S1-13 | 48 SP | **Active** |
| S2 (Core Data) | S2-01 through S2-13 | 72 SP | Planned |
| S3 (Scheduling) | S3-01 through S3-10 | 74 SP | Planned |
| S4 (Attendance) | S4-01 through S4-11 | 74 SP | Planned |
| S5 (Payments) | S5-01 through S5-12 | 100 SP | Planned |
| S6 (Portals + SMS) | S6-01 through S6-20 | 120 SP | Planned |
| S7 (Hardening) | S7-01 through S7-14 | 80 SP | Planned |
| S8 (Go-Live) | S8-01 through S8-11 | 36 SP | Planned |

### 15.3 Future Backlog (Should-Have / Could-Have)

| Item | Epic | Priority | Notes |
|------|------|----------|-------|
| Email notifications | E-15 | Should Have | SMTP/Mailgun integration |
| Scheduled report emails | E-16 | Should Have | Cron-triggered email with attachment |
| Announcements module | — | Should Have | Admin broadcast to parents |
| Notes upload (rich text) | E-11 | Should Have | Beyond PDF/photo |
| Payment aging report | E-18 | Should Have | Partially covered in Sprint 6 |
| Holiday calendar auto-populate | E-06 | Could Have | Kenya public holidays API |
| Parent self-registration (OTP) | E-10 | Could Have | Reduce admin burden |
| QR check-in | — | Could Have | Phase 3 |
| KNEC/EMIS export | — | Could Have | Standards compliance |
| AI absence prediction | — | Future | Phase 3+ |
| Native mobile app | — | Future | Post-web proven |

### 15.4 Technical Debt Backlog

| Item | Origin | Effort | Priority |
|------|--------|--------|----------|
| Audit log table partitioning by month | AW5 | 4h | Medium |
| Service worker cache for timetable/roster (beyond attendance) | AW4 | 8h | Low |
| Edge Function keep-warm cron job | AW3 | 2h | Low |
| Redis caching for dashboards | AW2 | 12h | Future |
| DB read replicas + connection pooling | AW1 | 16h | Future |
| Migration from `docs/migrations/` stubs to `supabase/functions/` | TD2 | 1h | **Immediate** |

### 15.5 Bug Backlog

(Empty — no production code written yet.)

### 15.6 Enhancement Backlog

| Item | Epic | Effort | Priority |
|------|------|--------|----------|
| Teacher substitution flow | E-06 | 8h | Medium |
| Student self-attendance view (future login) | E-10 | 16h | Low |
| Multi-currency support | — | 20h | Future |
| SMS cost tracking dashboard | E-15 | 8h | High (for resale) |
| Bill generation for sent SMS (per tenant) | E-14 | 12h | High (for resale) |

---

## Step 16: Release Plan

### 16.1 Release Cadence

| Release | Version | Target Date | Scope | Success Criteria |
|---------|---------|-------------|-------|------------------|
| **Alpha** | v0.1.0–v0.5.0 | Sprint 2-4 | Core CRUD + scheduling + attendance. Internal demo only. | Admin can manage school; teacher can mark attendance; calendar shows sessions |
| **Internal Demo** | v0.6.0 | Sprint 5 end | + M-Pesa STK flow working (sandbox) | End-to-end payment flow in sandbox (trigger → callback → reconcile) |
| **Beta** | v1.0.0-beta | Sprint 6 end | Full MVP feature set on staging. | All Must-Have features operational; UAT-ready |
| **UAT Pilot** | v1.0.0-rc1 | Sprint 7 mid | Malingi pilot with real data | 3 teachers marking attendance; 10 parents receiving SMS; bursar reconciling payments |
| **Production** | v1.0.0 | Sprint 8 end | Malingi go-live | All quality gates pass; Malingi data imported; production monitoring active |
| **v1.1** | v1.1.0 | 4 weeks post-launch | Should-Have features: email, announcements, aging report, offline queue | Phase 2 items deployed; Malingi usage > 80% adoption |
| **v2.0** | v2.0.0 | 12 weeks post-launch | QR check-in, parent self-registration, KNEC export | Phase 3 items; second tenant onboarded |

### 16.2 Go/No-Go Criteria for Launch

**ALL of the following must be true before production launch:**

- [ ] All Must-Have features pass E2E tests
- [ ] RLS leak tests pass (cross-tenant verified)
- [ ] M-Pesa STK→callback→reconciliation flow passes with real sandbox
- [ ] WCAG 2.1 AA audit passes (no critical/high violations)
- [ ] k6 load test: STK endpoint < 2s p95, dashboard < 2s p95 with realistic data volume
- [ ] UAT pilot: ≥ 3 teachers, ≥ 5 parents, 1 bursar have used the system for ≥ 3 days
- [ ] M-Pesa production credentials live and tested
- [ ] SMS sender ID registered and tested
- [ ] Backup + restore runbook validated
- [ ] Rollback plan documented and tested
- [ ] Malingi data imported and verified
- [ ] Training delivered to Malingi admin team
- [ ] Support channels established (Mobiwave on-call)

---

## Step 17: Quality Gates

### 17.1 Per-Milestone Quality Gates

| Gate | Description | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 |
|------|-------------|----|----|----|----|----|----|----|----|----|
| **QG-01** | Code compiles (next build) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-02** | Unit tests pass (≥ 80% coverage) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-03** | Integration tests pass | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-04** | RLS leak test passes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-05** | No lint/type errors | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-06** | API documentation updated | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-07** | Database documentation updated | — | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| **QG-08** | Security scan (npm audit) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-09** | Accessibility (no critical violations) | — | — | — | — | — | ✓ | ✓ | ✓ | ✓ |
| **QG-10** | Performance benchmark (k6) acceptable | — | — | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-11** | Code reviewed | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-12** | All requirements satisfied | — | — | — | — | — | — | ✓ | ✓ | ✓ |
| **QG-13** | CHANGELOG updated | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-14** | E2E critical paths pass | — | — | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QG-15** | UAT sign-off | — | — | — | — | — | — | — | ✓ | ✓ |

### 17.2 Quality Gate Enforcement

- **QG-01 through QG-05:** Automated in CI (PR cannot merge without passing)
- **QG-06 through QG-08, QG-11, QG-13:** PR checklist (human-reviewed)
- **QG-09, QG-10, QG-14, QG-15:** Milestone review (demonstration + scan report)

---

## Step 18: AI Development Strategy

### 18.1 AI Agent Allocation

Assuming multiple AI coding agents (Claude Code, Codex, etc.) are available:

| Agent ID | Role | Focus Areas | Tools |
|----------|------|-------------|-------|
| **Agent A** | **Frontend Lead** | UI components, pages, forms, state management, PWA | SvelteKit, Svelte 5, Tailwind, SvelteKit Superforms, Zod |
| **Agent B** | **Backend Lead** | Edge Functions, Supabase, M-Pesa integration, SMS engine, report engine | Deno, Supabase CLI, Daraja API, Mobiwave API |
| **Agent C** | **Database & RLS** | Migrations, RLS policies, triggers, indexes, seed data, credential encryption | SQL, Supabase Vault, Pgmq |
| **Agent D** | **Testing & QA** | Unit/integration tests, Playwright E2E, k6 perf, OWASP ZAP, a11y | Vitest, Playwright, k6, axe-core, ZAP |
| **Agent E** | **Documentation & DevOps** | CI/CD, deployment, docs sync, CHANGELOG, user guides | GitHub Actions, Terraform, Markdown |

### 18.2 Workflow Design for Minimal Merge Conflicts

**Principle:** Reduce shared file surface area. Each agent owns a clear file boundary.

```
Agent A (Frontend)          Agent B (Backend)          Agent C (DB/RLS)
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│ src/app/         │       │ supabase/functions│       │ supabase/migrations │
│ src/components/  │       │ src/app/api/     │       │ supabase/seed.sql  │
│ src/lib/         │       │ src/lib/services/ │       │                    │
│   (client code)  │       │   (server code)   │       │ RLS policies       │
│ src/store/       │       │ credential logic  │       │ Vault setup        │
│ public/          │       │ notification eng  │       │                    │
└──────────────────┘       └──────────────────┘       └────────────────────┘
         │                         │                           │
         └─────────────────────────┴───────────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  Agent D (QA)     │
                        │  tests/           │
                        │  e2e/             │
                        │  k6/              │
                        └───────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  Agent E (Docs)   │
                        │  docs/            │
                        │  CI/CD config     │
                        └───────────────────┘
```

### 18.3 Conflict Zones (Shared Files — Need Coordination)

| File | Agents Involved | Mitigation |
|------|----------------|------------|
| `supabase/config.toml` | B, C | Owned by Agent C (DB). B proposes changes via PR. |
| `src/lib/supabaseClient.ts` | A, B | Shared client. Agent A owns. B sends PR for server-side additions. |
| `package.json` | A, B, E | Agent A owns. Dependencies added via PR. Agent E updates scripts. |
| `docs/api.md` | B, E | Agent B updates API spec. Agent E syncs formatting. |
| `supabase/migrations/*` | C | **Exclusive ownership.** Only Agent C writes migrations. Others never touch. |
| `.env.example` | A, B, E | Agent E owns. Changes via PR. |

### 18.4 Coordination Protocol

1. **Daily sync:** At start of each day, agents read the latest `main` branch. No long-lived branches (max 3 days).
2. **Migration ownership:** Only Agent C creates/modifies migration files. Other agents submit schema change requests as issues.
3. **API contract first:** Before Agent A builds a UI page, Agent B + Agent C agree on the API contract (shape, params, errors). The contract is documented in `docs/api.md` before any UI code is written.
4. **Shared types:** Zod schemas live in `src/lib/schemas/` and are shared between frontend validation and backend API validation. Agent B owns the canonical version.
5. **PR racing:** If two agents have PRs that touch the same files, the first merged PR needs the second to rebase. Merge order should be: DB migrations → Backend API → Frontend UI → Tests → Docs.

### 18.5 AI Review Workflow

```
Agent A pushes PR (Frontend)
  → CI runs (Agent D's test suite)
  → Agent B reviews API interaction
  → Agent E reviews docs impact
  → Auto-merge if all gates pass

Agent B pushes PR (Backend)
  → CI runs
  → Agent C reviews DB impact (migration compatibility, RLS)
  → Agent D reviews test coverage
  → Auto-merge if all gates pass
```

---

## Step 19: Development Dashboard

### 19.1 Dashboard Layout

```
╔══════════════════════════════════════════════════════════════════╗
║                   ReClass — Development Dashboard               ║
╠══════════════════════════════════════════════════════════════════╣
║  Overall Progress:  ████████░░░░░░░░░░  42%  (Sprint 5 of 8)   ║
║                                                               ║
║  Sprint Progress:   ████████████████░░  84%  (Sprint 5)       ║
║                                                               ║
║  Velocity:          Planned: 120 SP | Completed: 101 SP | 84% ║
║                                                               ║
║  Burndown:          ████████████░░░░░░░░░░░░░░░░░░░ 19 SP rem ║
║                                                               ║
║  Blocked Tasks:     3                                          ║
║    • S5-04 STK Edge Function — awaiting Daraja sandbox creds   ║
║    • S5-11 Daraja mock server — blocked on S5-04 spec          ║
║    • S3-07 Holiday calendar — blocked on Malingi holiday data  ║
║                                                               ║
║  Completed Features:                                            ║
║    ✓ Auth (Login, RBAC, MFA, RLS)                              ║
║    ✓ Student/Teacher/Subject CRUD                              ║
║    ✓ Bulk CSV import                                            ║
║    ✓ Scheduling + Calendar + Conflict Detection                 ║
║    ✓ Attendance Marking + Lock + Approve                        ║
║    ✓ Offline Attendance Queue                                   ║
║    ◐ M-Pesa STK (in progress — callback pending)               ║
║                                                               ║
║  Upcoming Milestones:                                           ║
║    ► Sprint 5: M-Pesa Payments (due Fri)                       ║
║    ► Sprint 6: Parent/Teacher Portals + SMS (due +2 wks)       ║
║    ► Sprint 7: Hardening + UAT                                  ║
║    ► Sprint 8: Go-Live                                          ║
║                                                               ║
║  Known Risks:                                                   ║
║    ⚠ R-01 M-Pesa sandbox ≠ prod (HIGH)                        ║
║    ⚠ R-12 Daraja production creds not yet applied (HIGH)       ║
║    ⚠ R-06 Timeline: 6 weeks vs 10 weeks estimated (MEDIUM)    ║
║                                                               ║
║  Technical Debt:                                                ║
║    • TD2: Migration stubs in docs/ need removal (1h)           ║
║    • TD3: Missing lint/test scripts in package.json (0.5h)      ║
║                                                               ║
║  Release Readiness:  ██░░░░░░░░░░░░░░  18%  (v1.0.0-beta)     ║
╚══════════════════════════════════════════════════════════════════╝
```

### 19.2 Key Metrics to Track

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Sprint Velocity | 80–120 SP/sprint | 101 SP | ↑ |
| Test Coverage | ≥ 80% | 76% | ↑ |
| CI Pass Rate | > 95% | 92% | ↑ |
| Blocked Tasks | < 2 | 3 | ↓ |
| Open Bugs | < 5 | 2 | ↑ |
| RLS Leak Tests | 100% pass | 100% pass | ✓ |
| Deployment Frequency | Weekly | Weekly | ✓ |
| Mean Time to Merge | < 4h | 3.5h | ↑ |

---

## Step 20: Execution Instructions

### 20.1 Build Agent Protocol

The build agent(s) MUST follow this protocol for every milestone:

1. **Read** the milestone plan
2. **Verify** prerequisites are met
3. **Execute** tasks in order (honouring dependencies)
4. **Test** each task before moving to the next
5. **Stop** when milestone acceptance criteria are met
6. **Present** results for review
7. **Incorporate** feedback
8. **Proceed** to next milestone ONLY after sign-off

### 20.2 Milestone Execution Template

Each milestone execution follows this template:

---

### MILESTONE: [Name]

**Objective:** [1-2 sentence goal]

**Prerequisites:**
- [ ] Prerequisite milestone X complete
- [ ] Environment Y configured
- [ ] Credential Z available

**Tasks:**

| Order | ID | Task | Owner | Est. Time | Dep |
|-------|-----|------|-------|-----------|-----|
| 1 | T-XXX | ... | Agent A | 4h | — |
| 2 | T-YYY | ... | Agent B | 6h | 1 |

**Expected Outputs:**
- [ ] Output file A created
- [ ] Service B operational
- [ ] Database migration C applied

**Acceptance Criteria:**
1. ...
2. ...

**Quality Checks:**
- [ ] QG-01: Compiles without errors
- [ ] QG-02: Tests pass (≥ 80% coverage)
- [ ] QG-04: RLS leak test passes
- [ ] QG-05: No lint/type errors
- [ ] QG-11: Code reviewed

**Deliverables:**
- Code changes on branch `feat/<milestone-name>`
- PR created with checklist
- Documentation updated
- CHANGELOG updated

**Review Checklist:**
- [ ] Acceptance criteria met
- [ ] All quality gates pass
- [ ] No new bugs introduced
- [ ] Documentation reflects changes
- [ ] Edge cases handled
- [ ] Error states implemented
- [ ] Loading/empty/error states verified in UI

---

### 20.3 Critical Directives for the Build Agent

1. **DO NOT skip RLS.** Every new table MUST have a `tenant_isolation` policy. The first integration test MUST verify cross-tenant isolation. This is non-negotiable.

2. **DO NOT skip audit.** Every mutating service (create, update, delete, waiver, override) MUST write to `audit_log`. This is foundational to the product's trust model.

3. **DO NOT commit secrets.** Credentials are stored encrypted via Supabase Vault. NEVER log `encrypted_blob` plaintext. NEVER return credentials in API responses.

4. **M-Pesa first.** Start Daraja sandbox exploration in Sprint 1. Do NOT wait until Sprint 5. The integration risk is the highest in the project.

5. **Tests with every PR.** Every PR must include tests. Coverage targets are enforced in CI. If a PR reduces coverage, it is blocked.

6. **Migration safety.** Every migration must be backward-compatible (additive only). No destructive changes (DROP, RENAME without shadow). Use expand/contract pattern.

7. **Contract-first for UI.** Before building a page, the API contract must be documented and agreed. This prevents rework when the backend changes.

8. **Stop at milestone boundaries.** After each milestone, stop, verify, and present for review. Do NOT start the next milestone until the current one is accepted.

---

### 20.4 Sprint-Specific Execution Notes

| Sprint | Key Focus | Danger Zones | Buffer Tasks |
|--------|-----------|--------------|--------------|
| S1 | Getting Supabase right | RLS policy completeness; JWT custom claims | S1-07 (session mgmt) can slip to S2 |
| S2 | CRUD quality | CSV import encoding; RLS on 10+ tables | S2-13 (PWA) can slip to S3 |
| S3 | Recurrence logic | RRULE edge cases; calendar performance | S3-07 (holidays) can be done in S4 |
| S4 | Offline-first attendance | IndexedDB sync conflicts; lock cron timing | S4-09 (chronic absence) can slip |
| **S5** | **M-Pesa correctness** | **Idempotency; CheckoutRequestID uniqueness; timeout handling** | **Nothing — this sprint is the critical path** |
| S6 | Portal polish + SMS reliability | i18n coverage; SMS cost tracking | S6-18 (super admin usage) can slip |
| S7 | UAT responsiveness | Bug fix prioritisation; training materials | S7-13 (load test) can be post-launch |
| S8 | Go-live discipline | DNS propagation; M-Pesa cred verification | S8-10 (rollback validation) is non-negotiable |

---

## Appendix A: Key Architecture Decisions (ADRs)

| ADR | Decision | Rationale | When |
|-----|----------|-----------|------|
| ADR-001 | Multi-tenant via RLS (not schema-per-tenant) | Faster development; one Supabase project; RLS is proven at <10k users | Day 1 |
| ADR-002 | SMS must-have (not optional) | Majority of Kenyan parents are feature-phone users; SMS is the universal channel | Day 1 |
| ADR-003 | M-Pesa only (no Stripe/Paystack) | M-Pesa is Kenya's dominant payment rail; STK Push is consumer-friendly | Day 1 |
| ADR-004 | Session-based attendance (not daily) | Remedial runs in sessions; per-day model loses the remedial unit | Day 1 |
| ADR-005 | Credential isolation (no owner fallback) | Each school must use its own paybill for clean reconciliation | Day 1 |
| ADR-006 | Offline-first for attendance only | Attendance is the only offline-critical operation; timetable/view data can be cached | Sprint 4 |
| ADR-007 | Audit as first-class module | Product sells accountability; every mutating action is logged | Day 1 |
| ADR-008 | PWA + responsive web (no native app) | Reach on all devices; lower dev cost; native app is Phase 4 | Day 1 |

## Appendix B: Key Contacts & Escalation

| Role | Name | Responsibility |
|------|------|---------------|
| Product Owner | Mobiwave Product Team | Scope decisions, priority, UAT |
| Engineering Manager | (This document) | Sprint plan, risk management, milestone gating |
| Architecture Authority | Mobiwave Architecture | ADR overrides, RLS review, encryption design |
| Security Lead | (To assign) | OWASP review, DPA compliance, penetration test |
| DevOps Lead | (To assign) | CI/CD, VPS, Supabase project, backups |
| Malingi Admin | (To assign) | UAT coordinator, training, data import |

## Appendix C: Quick Reference — Sprint Timeline

```
Week  1│███████████████████│ S1: Foundation + Auth
Week  2│███████████████████│ S2: Core Data Management
Week  3│███████████████████│ S3: Scheduling + Calendar ←║║→ S5 prep: Daraja exploration
Week  4│███████████████████│ S4: Attendance (part 1)
Week  5│███████████████████│ S4: Attendance (part 2) ←║║→ S5: M-Pesa (start)
Week  6│███████████████████│ S5: M-Pesa (continue) ←║║→ S6 prep: SMS engine start
Week  7│███████████████████│ S6: Portals + SMS Engine
Week  8│███████████████████│ S6 (cont) + S7 prep: Reports + Audit
Week  9│███████████████████│ S7: Hardening + UAT
Week 10│███████████████████│ S8: Go-Live + Handover
```

> **⚠️ M-Pesa production credentials (Safaricom approval): START APPLICATION IN WEEK 1.**
> The Safaricom approval process can take 1–2 weeks. If not started immediately, this will delay Go-Live by at least 1 week regardless of development progress.

---

## Appendix D: Change Log

| Date | Author | Change | Version |
|------|--------|--------|---------|
| 2026-07-13 | Engineering Management | Initial sprint plan & project orchestration document | v1.0 |
