# ReClass — Remedial Classes Management System
## Software Requirements & Architecture Package (SRS)

**Product:** ReClass (Remedial Classes Management System)
**Vendor / Client:** Mobiwave Innovations Ltd
**Anchor Tenant:** Malingi High School (Founding Partner)
**Document type:** Master SRS (covers all 30 sections; deep dives live in companion docs)
**Version:** 1.0 · **Status:** Pre-development (planning)
**Author:** Mobiwave Product & Architecture Team
**Date:** 2026-07-12

---

## 0. Document Conventions & Scope Decisions

This package is the single source of truth before any code is written. It is deliberately over-specified so the development team never has to guess. Companion deep-dive documents:

- `docs/README.md` — package index & product overview
- `docs/design.md` — design system (Section 12, full)
- `docs/database.md` — database design (Section 14, full)
- `docs/api.md` — REST API design (Section 15, full)
- `docs/architecture.md` — C4 + backend/frontend architecture (Sections 16/17)
- `docs/security.md` — security (Section 18, full)
- `docs/deployment.md` — deployment, CI/CD, DR (Section 24, full)
- `docs/testing.md` — testing strategy (Section 23, full)
- `docs/roadmap.md` — roadmap & milestones (Sections 26/30)
- `docs/guides/developer-guide.md`, `user-guide.md`, `admin-guide.md`
- `docs/CHANGELOG.md`

### Locked architecture decisions (challenge-proof)
1. **Multi-tenant from day one.** Tenant boundary = `school_id`, enforced at the row level via Postgres Row Level Security (RLS). Malingi is tenant #1. The founding-partner strategic note ("reusable across all future schools") is a hard requirement, not a nice-to-have.
2. **Backend = Supabase** (managed Postgres + Auth + Storage + Realtime + Edge Functions). Deliberately reduces boilerplate so the 6-week timeline is realistic.
3. **Frontend = SvelteKit + Svelte 5 + TypeScript + TailwindCSS.** Hosted on Vercel with the SvelteKit adapter.
4. **Payments = M-Pesa Daraja (STK Push)** as the only payment rail at launch. No card/Stripe/Paystack. (Aligned with your standing directive.)
5. **Messaging:** SMS via **Mobiwave** = **must-have** at go-live (universal feature-phone reach in Kenya). Email = should-have. WhatsApp is NOT in scope. I upgraded SMS from your "optional add-on" — see Section 28 for the justification.
6. **No native mobile app at launch.** PWA + fully responsive web. Native app = future phase (your proposal agrees).

---

# 1. Executive Summary

## 1.1 Problem Statement
Malingi High School runs remedial classes (extra tuition for students needing academic support) using entirely manual processes: paper registers, hand-written timetables, cash/手动 M-Pesa payments tracked in notebooks, and word-of-mouth communication with parents. This produces (a) attendance data that is error-prone and unauditable, (b) no real-time view of who owes fees, (c) parents kept in the dark on attendance and schedules, (d) hours of manual report compilation that is rarely accurate, and (e) zero empirical evidence on whether remedial programmes improve outcomes.

## 1.2 Proposed Solution
ReClass is a secure, responsive, web-based multi-tenant platform that digitizes the full remedial-class lifecycle: student/teacher/subject administration, scheduling & timetables, attendance, M-Pesa fee collection, parent & teacher portals, and management reporting. It runs in any modern browser on desktop, tablet, or phone. Tenant #1 is Malingi High School; the same instance will onboard subsequent schools with configuration only.

## 1.3 Business Goals
- Eliminate paper registers, receipts, and schedules.
- Increase fee-collection speed and traceability via M-Pesa STK Push.
- Give parents real-time visibility into attendance, payments, and timetable.
- Give management a single source of truth with live dashboards.
- Build a reusable product Mobiwave can resell to other schools (compounding ROI).

## 1.4 Expected Benefits (quantified target)
| Benefit | Baseline (manual) | Target after ReClass |
|---|---|---|
| Time to compile monthly attendance report | 4–6 hours | < 2 minutes (export) |
| Fee reconciliation time | 1 day/week | Real-time dashboard |
| Parent notification latency | Days / never | < 5 min (SMS on event) |
| Attendance record accuracy | Unknown / error-prone | Audit-logged, 99%+ completeness |
| Payment traceability | Notebook + vague MPESA msg | Per-student ledger, reconciled |

## 1.5 Success Metrics (KPIs)
- **Adoption:** ≥ 90% of Malingi remedial teachers mark attendance in-app within 4 weeks of go-live.
- **Payment coverage:** ≥ 80% of due remedial fees collected via M-Pesa link within 30 days of invoice.
- **Engagement:** ≥ 60% of linked parents open the portal or receive ≥ 1 SMS/month.
- **Accuracy:** Attendance edit-after-approval rate < 2% (proves discipline, not errors).
- **Uptime:** ≥ 99.5% monthly (Supabase managed + EVO VPS).
- **Support load:** < 5 tickets/school/week by month 3.

---

# 2. Market Research

## 2.1 Competitor Landscape
| Product | Type | Strengths | Weaknesses |
|---|---|---|---|
| **SMIS / KEMIS** (govt) | National EMIS | Free, official, exam-linked | Not remedial-specific; poor UX; slow |
| **School ERP (e.g. Macmillan, SkoolMaster, TCs)** | Full school ERP | Broad modules | Expensive, heavy, weak parent comms, no M-Pesa-native |
| **LMS (Google Classroom, Moodle)** | Learning | Free/content delivery | No fees, no attendance-as-product, no parent portal |
| **Spreadsheets + MPESA** | Manual | Zero cost | No automation, no audit, no parent view |
| **Cal.com / Calendly** | Scheduling only | Great booking UX | No fees, no students, no school model |

## 2.2 Strengths of ReClass (positioning)
- **Remedial-native:** purpose-built for extra classes, not a bolted-on ERP module.
- **M-Pesa-native STK Push:** parents pay in 2 taps from an SMS/portal link; reconciled automatically.
- **Parent visibility:** the differentiator most ERPs neglect — attendance + payments + timetable in one parent view.
- **Kenya-first:** SMS (feature phones), EN/SW bilingual, CBC-aware, KNEC-friendly exports.
- **Multi-tenant reuse:** Mobiwave resells the same instance → low marginal cost per new school.

## 2.3 Market Gaps ReClass Exploits
- Full-school ERPs ignore remedial as a distinct billing/attendance unit.
- Most parent portals are read-only PDF dumps; ReClass makes parents *act* (pay, acknowledge).
- No product pairs M-Pesa STK Push with per-student fee ledgers and attendance-linked reminders.
- Offline-tolerant PWA for low-connectivity classrooms is rare in this segment.

## 2.4 Recommended Improvements (vs. initial brief)
- Upgrade **SMS to must-have** (Section 28).
- Add **attendance-by-class-session** model (not per-day) — remedial runs in sessions, not standard periods.
- Add **fee-link deep linking** so an SMS can open the exact outstanding invoice.
- Add **offline queue** for attendance marking in dead-zone classrooms.

---

# 3. Stakeholders

| Stakeholder | Description | Primary interest |
|---|---|---|
| **Super Admin (Mobiwave)** | Platform operator; manages tenants, billing, infra, global config | Tenant isolation, uptime, resale |
| **School Admin (Malingi)** | Creates students/teachers/subjects, sets fees, assigns classes, views reports | Operational control, accuracy |
| **Principal / HOD** | Oversees remedial programme, approves attendance, reviews effectiveness | Oversight, accountability |
| **Teacher** | Marks attendance, views timetable, uploads notes, sees enrolled students | Low-friction marking, clarity |
| **Student** | Attends remedial classes (record only; no login at launch) | Accurate record, fair fees |
| **Parent / Guardian** | Views attendance, payments, timetable; pays fees; receives alerts | Visibility, easy payment |
| **Accountant / Bursar** | Reconciles M-Pesa, views revenue reports, manages waivers | Reconciliation, audit trail |
| **System (automated)** | Workers, schedulers, notification engine | Reliability, idempotency |
| **Third-party APIs** | M-Pesa Daraja, SMS gateway (Mobiwave), Email/SMTP | Contract compliance, retries |
| **Regulator / KNEC (future)** | May require standardized exports | Standards compliance |

---

# 4. User Personas

**A. Mwalimu Achieng — Remedial Teacher (34, Nairobi/Malindi.**
- *Pain:* Paper register slows her down; she forgets who paid; no feedback on effectiveness.
- *Goal:* Mark attendance in under 2 min, see her timetable, know her students.
- *Behaviour:* Smartphone-first; comfortable with SMS alerts; distrusts "complicated systems."
- *Tech:* High. *Daily:* opens portal before class, marks attendance, occasionally uploads a note.

**B. Mama Fatuma — Parent (41, small business owner).**
- *Pain:* Never knows if child attended; finds out about fees late; no smartphone data.
- *Goal:* Get an SMS when child is absent; pay fees by phone instantly.
- *Behaviour:* Feature phone, M-Pesa daily, reads SMS, rarely uses a browser.
- *Tech:* Low. *Daily:* receives SMS, STK Push to pay.

**C. Mr. Omondi — Bursar (50).**
- *Pain:* Reconciling MPESA messages to students takes a full day weekly; no ledger.
- *Goal:* One dashboard showing paid/owing; auto-reconciled M-Pesa.
- *Behaviour:* Desktop, Excel power-user, suspicious of black boxes.
- *Tech:* Medium. *Daily:* opens revenue report, exports to Excel, approves waivers.

**D. Admin Jane — School Admin (29).**
- *Pain:* Data entry is duplicated; no single source of truth.
- *Goal:* One place to manage students/teachers/subjects/fees.
- *Behaviour:* Laptop, organized, trains others.
- *Tech:* High. *Daily:* onboarding, fee setup, support.

---

# 5. Functional Requirements

Grouped by module. Each feature lists purpose, business rules, dependencies, edge cases, acceptance criteria.

## Module A — Administration
**A1 Student Management**
- Purpose: maintain remedial students (linked to a standard class/grade).
- Features: CRUD student, bulk import (CSV), link to parent(s), assign to remedial groups, soft-delete, photo (optional).
- Business rules: admission_no unique per school; a student may have ≤2 guardians; cannot delete a student with unpaid fees (must deactivate).
- Edge: duplicate admission_no rejected; CSV import validates rows, reports failures.
- AC: Admin can import 200 students in < 1 min; duplicate detection works; deactivated students hidden from active lists but retained.

**A2 Teacher Management**
- CRUD teacher, assign subjects, link login account, active/inactive.

**A3 Subject & Remedial Group Management**
- Subject catalog (e.g. Mathematics, English); remedial groups = subject + cohort + teacher + schedule.

**A4 User & Role Management**
- Roles: super_admin, school_admin, principal, teacher, bursar, parent. RBAC via Supabase Auth + app roles table.
- AC: a teacher cannot be granted admin; role changes are audited.

**A5 School/Tenant Settings**
- Branding (name, logo, colors), M-Pesa shortcode + paybill (per tenant), SMS sender ID, academic year/terms, currency (KES).

## Module B — Remedial Classes & Scheduling
**B1 Timetable / Session Scheduling**
- Purpose: define recurring remedial sessions (day, start/end, room, teacher, group).
- Business rules: a room cannot be double-booked in the same slot (soft-warn, not hard-block, with override by admin); a teacher cannot be in two rooms at once (warn).
- Edge: public holidays (KE calendar) skip sessions; term breaks pause recurrence.
- AC: conflict detection highlights overlaps; admin can override with reason logged.

**B2 Teacher Assignment & Room Allocation**
- Assign teacher to group; allocate classroom; capacity limit with waitlist flag.

**B3 Calendar View**
- Month/week/agenda; filter by teacher/group/room; click session → roster.

## Module C — Attendance
**C1 Session Attendance**
- Mark present/late/absent/excused per student per session.
- Business rules: **attendance is locked 24h after session end OR after principal approval — whichever first**; edits after lock require a reason + auditor review; marking only by assigned teacher or admin.
- Edge: teacher marks before session start → blocked (or flagged "early"); student added after marking → appears unmarked.
- AC: bulk "mark all present" + per-student override; late has timestamp; absent triggers parent SMS (if enabled).

**C2 Attendance Analytics**
- Per student, group, teacher, term: rate, trend, chronic-absence flag.

**C3 QR / Offline (future/phase 2)**
- QR check-in; offline queue flushes on reconnect.

## Module D — Payments & Fees
**D1 Fee Definition**
- Define fee types (e.g. "Term 1 Remedial", "Exam Prep Bootcamp"), amount, due date, per group or per student.

**D2 Invoicing**
- Auto-generate invoice per student when fee assigned; track balance.

**D3 M-Pesa STK Push**
- Trigger STK Push to parent phone; on callback, reconcile to invoice; idempotent by CheckoutRequestID.
- Business rules: **payment cannot exceed invoice balance**; overpayment → credit note, not refund-by-M-Pesa (manual); failed STK → retry once, then mark "awaiting."
- Edge: parent enters wrong phone; timeout (60–120s) → status "pending" until callback or manual reconcile.
- AC: parent receives prompt, pays, ledger updates within 30s of callback; reconciliation report matches MPESA.

**D4 Payment History & Waivers**
- Ledger per student; bursar can apply waiver/discount with reason.

**D5 Outstanding Balances & Reminders**
- List owing; send reminder SMS; auto-reminder at 3/7/14 days past due (configurable).

## Module E — Parent Portal
- View linked students' attendance, timetable, outstanding fees, pay via STK link, announcements.
- Business rules: **parent sees only linked students; cross-school data invisible** (RLS).
- AC: parent login shows only their children; "Pay now" triggers STK to their number.

## Module F — Teacher Portal
- View timetable, mark attendance, upload notes (Supabase Storage), see enrolled students.
- AC: teacher sees only assigned groups.

## Module G — Reports & Analytics
- Revenue (collected/owing by fee/term), attendance %, participation, teacher workload, payment aging.
- Export CSV/PDF; scheduled email to principal/bursar.

## Module H — Communications (cross-cutting)
- SMS (Mobiwave)/Email/in-app; template library; event triggers; retry with backoff; opt-out (SMS STOP).
- See Section 20.

---

# 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Dashboard < 2s p95; attendance bulk-mark (40 students) < 1s; report export < 5s for 1 term |
| **Scalability** | Single instance supports 100 → 100k users (Section 25); RLS tenant isolation |
| **Availability** | ≥ 99.5% monthly (Supabase managed + EVO VPS + health checks) |
| **Security** | OWASP Top 10 covered (Section 18); encryption at rest + TLS; secrets in vault; RLS mandatory |
| **Accessibility** | WCAG 2.1 AA; keyboard nav; sufficient contrast; screen-reader labels; Swahili + English |
| **Localization** | EN primary, SW secondary; date/currency KES; timezone EAT (Africa/Nairobi) |
| **Audit logs** | Every mutating action logged (actor, tenant, before/after, IP) — immutable append |
| **Backups** | Daily PITR (Supabase) + weekly export to Mobiwave cold storage; 35-day retention |
| **Compliance** | Kenya Data Protection Act 2019; minor (student) data minimized; consent for SMS |
| **Maintainability** | Typed codebase; <5% duplicate; automated tests; documented ADRs |
| **Browser support** | Last 2 versions of Chrome/Edge/Firefox/Safari; mobile Safari/Chrome Android |
| **Offline support** | Attendance queue + read cache (PWA); reconnect flush |
| **Device support** | Desktop, tablet, smartphone; 320px → 4K; touch + mouse |

---

# 7. User Stories (selected; full set in repo backlog)

- As a **teacher**, I want to mark all present with one tap then adjust individuals, so that I save time.
- As a **teacher**, I want attendance to pre-fill from the roster, so that I only change exceptions.
- As a **parent**, I want an SMS when my child is absent, so that I can follow up immediately.
- As a **parent**, I want to pay fees from the SMS link, so that I don't visit the school.
- As a **bursar**, I want auto-reconciled M-Pesa, so that I stop spending a day weekly on ledgers.
- As a **bursar**, I want to apply a waiver with a reason, so that the audit trail is clean.
- As a **principal**, I want to approve attendance, so that it becomes locked and trustworthy.
- As a **admin**, I want bulk-import students, so that onboarding takes minutes not days.
- As a **admin**, I want conflict warnings on scheduling, so that double-bookings are caught.
- As a **super admin**, I want per-tenant usage stats, so that I can bill and support schools.
- As a **parent**, I want EN/SW toggle, so that I read in my preferred language.
- As a **teacher**, I want offline marking in dead zones, so that connectivity doesn't block class.
*(Hundreds more enumerated in backlog; acceptance criteria attached per story in issue tracker.)*

---

# 8. Complete Feature List (MoSCoW)

**Must Have:** Student/Teacher/Subject/Group CRUD; RBAC; Tenant settings; Timetable + conflict detection; Session attendance + lock/approve; Attendance analytics; Fee definition + invoicing; M-Pesa STK Push + reconciliation; Ledger + waivers; Outstanding + reminders; Parent portal (view + pay); Teacher portal; Management reports (CSV/PDF); SMS notifications; Audit log; Daily backups; EN/SW; WCAG AA; PWA responsive.

**Should Have:** Email notifications; Scheduled report emails; Announcements; Notes upload; Offline attendance queue; Public holiday calendar; Payment aging report; Opt-out handling.

**Could Have:** QR check-in; In-app push; Multi-currency (future schools); KNEC export; Parent self-registration with OTP.

**Future:** Native mobile app; Full school ERP modules (admissions, exams, library, hostel, transport, inventory); AI performance analytics; Online learning/content delivery.

---

# 9. Complete System Logic

## 9.1 Login / Registration
1. User hits `/login` → Supabase Auth (email+password; MFA for admin roles).
2. On success, app fetches `profiles` + `user_roles` → role + tenant scoped.
3. RLS ensures all queries carry `school_id`.
4. Parent registration: admin creates parent record + sends invite link (OTP/email); parent sets password.
5. Failures: wrong password → generic error (no user enumeration); 5 fails → lockout + CAPTCHA + notify admin.

## 9.2 Attendance Flow
Teacher opens session → roster pre-filled → marks status → save (queued if offline) → on approve/24h lock → status `locked` → absences enqueue parent SMS.

## 9.3 Payment Flow (M-Pesa)
1. Bursar/admin or parent clicks "Pay" → `POST /payments/stk` with phone + invoice.
2. Edge Function calls Daraja STK Push → stores `CheckoutRequestID`, status `pending`.
3. Daraja callback → verify signature → reconcile to invoice (idempotent) → status `paid` → ledger update → notify parent (SMS confirmation) + bursar (realtime).
4. Timeout/no callback → status stays `pending`; admin can manually reconcile with MPESA reference.

## 9.4 Scheduling Flow
Admin creates session recurrence → system expands into occurrences → conflict detector warns → calendar renders.

## 9.5 Notifications Flow
Event (absence/payment due/invoice) → notification engine picks channel(s) per tenant config + parent preference + opt-out → render template → dispatch via gateway → log + retry (exp backoff).

## 9.6 Permissions / Failures / Recovery
- Permissions: RBAC + RLS; denied → 403 with audit.
- Failures: external API down → queue + status; DB error → rollback + alert.
- Recovery: PITR restore; idempotent jobs; dead-letter queue for failed notifications.

---

# 10. Business Rules
1. Attendance locked 24h post-session OR on principal approval (first wins); post-lock edits need reason + audit.
2. Payment cannot exceed invoice balance; overpayment → credit note (manual).
3. Teacher sees only assigned groups; parent sees only linked students; cross-tenant data invisible (RLS).
4. Cannot delete student with unpaid fees (deactivate only).
5. Room/teacher double-book → warn + require admin override reason.
6. M-Pesa reconciliation idempotent by CheckoutRequestID.
7. Waivers require reason + actor (audited); only bursar/admin.
8. SMS requires consent; STOP opts out (per phone, per tenant).
9. Admission_no unique per school.
10. Academic year/term gates fee due dates.
11. Soft-deletes everywhere; hard-delete only via purge job (retention policy).
12. Failed STK → one retry, then "awaiting" (no silent success).
13. **Per-tenant credentials:** each school stores its own Daraja + Mobiwave secrets (`purpose='school_send'`, encrypted). `super_admin`'s `purpose='platform_billing'` creds are for Mobiwave's OWN billing/operations only — never used to send/charge on a school's behalf. Resolution is strict: tenant `school_send` prod → sandbox → else `CREDS_NOT_FOUND` (no owner fallback). `school_send` creds are mandatory before a tenant can send messages or collect M-Pesa. Plaintext secrets never leave Edge Functions.

---

# 11. UX Design (summary; full in design.md)
- **Pattern:** left sidebar (role-scoped) + top bar (tenant, lang, profile) + content area; mobile = bottom tab nav.
- **Components:** cards, data tables (sort/filter/paginate), modals, toasts, empty/loading/error states, calendars.
- **Reference direction:** Flowbite Admin Dashboard supplies a disciplined operational shell, utility header, and report density. Preskool supplies school-native information architecture, academic context, and role dashboards. ReClass combines these patterns in its own restrained green and neutral visual system; it does not copy either template.
- **States:** skeletons on load; optimistic attendance save; inline validation; 401 → login.
- **Dark mode:** yes (system + toggle). **A11y:** focus rings, ARIA, 4.5:1 contrast.
- **Responsive:** 320–4K; touch targets ≥44px.

---

# 12. Design System — see `docs/design.md` (full).
Highlights: philosophy (calm, trustworthy, Kenya-first), type scale (Inter/Plus Jakarta + Swahili fallback), 8px grid, brand palette (Mobiwave indigo + Malingi green), tokens (Tailwind), components, animations, brand voice, responsive + microinteractions.

---

# 13. Information Architecture (sitemap)
```
/ (redirect by role)
/login, /invite/[token]
/admin
  /students, /teachers, /subjects, /groups, /fees, /settings, /users, /reports
/principal
  /attendance/approve, /reports, /effectiveness
/teacher
  /timetable, /attendance, /notes, /students
/parent
  /attendance, /timetable, /fees, /payments, /announcements
/shared
  /reports/export, /profile, /help
```
Breadcrumbs: `Admin / Students / [Admission No]`. Menu scoped by role.

---

# 14. Database Design — see `docs/database.md` (full).
Highlights: Postgres + RLS, ~25 tables (tenants, users/profiles, roles, students, parents, guardians_link, teachers, subjects, remedial_groups, sessions, session_occurrences, attendance, fee_types, invoices, invoice_lines, payments, waivers, notifications, audit_log, etc.), FKs, indexes, constraints, 3NF, soft-delete + audit fields (`created_by`, `created_at`, `updated_at`, `deleted_at`), data lifecycle + retention.

---

# 15. API Design — see `docs/api.md` (full).
REST (Supabase + custom Edge Functions). Versioned `/v1`. Auth: Supabase JWT (Bearer). Pagination (cursor), filtering, validation, standardized error envelope, rate limiting (per tenant + per user), idempotency keys for payments.

---

# 16. Backend Architecture — see `docs/architecture.md`.
Layers: Edge Functions (API/STK/callbacks), Supabase (Auth/DB/Storage/Realtime), workers (notification + reconciliation), queues (Supabase + external), caching (Redis optional later), jobs (cron for reminders/exports), storage (Supabase + S3-cold for backups).

---

# 17. Frontend Architecture — see `docs/architecture.md`.
SvelteKit route groups; role-scoped routes under `src/routes/(app)`; auth and application layouts; Svelte 5 rune state; SvelteKit Superforms + Zod; SvelteKit error boundaries; reusable component library under `src/lib/components/ui`; i18n (EN/SW).

---

# 18. Security — see `docs/security.md`.
Threat model, OWASP Top 10 mapped, auth (Supabase + MFA + lockout), RLS authorization, encryption (TLS + AES at rest), session mgmt, CSRF (SameSite + double-submit), XSS (CSP + sanitize), SQLi (parameterized/ORM), rate limiting, logging, monitoring, Data Protection Act.

---

## 19. Integrations
- **Mobiwave SMS Platform** (`https://sms.mobiwave.co.ke/api/v3`) — the ONLY SMS gateway (Bearer token). Endpoints: `/sms/send` (single/multi), `/sms/campaign` (contact-list bulk), `/contacts` (group sync), `/balance`, `/me`. Full spec in `integrations.md`. WhatsApp is intentionally NOT in scope.
- **Safaricom Daraja (M-Pesa STK Push)** — payments. Per-tenant paybill/shortcode + consumer key/secret/passkey. Callback HMAC-verified.
- **Email/SMTP or Mailgun** — transactional (invites, reports).
- **Supabase** — core BaaS (Auth/DB/Storage/Realtime).
- **Google Calendar / M365** (optional export, future).
- **KNEC / EMIS export** (future, standards).
- **Credential model:** each tenant admin sets & saves their own Daraja + Mobiwave credentials (`purpose='school_send'`, encrypted, per-tenant). `super_admin` sets `purpose='platform_billing'` credentials = Mobiwave's OWN account, used only for platform billing/operations — **never** as a fallback for a school's sends/charges. A school without its own `school_send` creds cannot send (or is on an explicit platform-managed plan where the owner provisions `school_send` creds for the tenant). Strict resolution, no silent owner fallback. See `integrations.md` §4, `api.md` §7, `database.md` (`credentials`).

---

# 20. Notifications
| Channel | Triggers | Template | Retry |
|---|---|---|---|
| SMS | absence, payment due, invoice, confirmation | per-tenant, EN/SW | 3× exp backoff; STOP opt-out |
| Email | invoice, report, invite | HTML | 3× backoff |
| In-app | all events | toast/bell | n/a |
Engine: event bus → per-tenant channel config → render → dispatch → log → DLQ on repeated failure.

---

# 21. Analytics
KPIs: collection rate, attendance rate, chronic absence, teacher workload, payment aging, programme effectiveness (attendance vs grade — future). Dashboards: Bursar (revenue), Principal (effectiveness), Admin (ops). Exports CSV/PDF. Future: BI warehouse + AI insights.

---

# 22. AI Opportunities
- **Absence predictor:** flag students likely to disengage (early warning).
- **Fee-default risk:** prioritize reminders.
- **NLP summaries:** auto monthly report narrative.
- **OCR:** bulk receipt/result slip capture (future).
- **Effectiveness analytics:** correlate remedial attendance with exam gains.

---

# 23. Testing Strategy — see `docs/testing.md`.
Unit (Vitest/Jest), Integration (Supabase test DB), E2E (Playwright — attendance + paymenthappy/sad paths), Performance (k6 on STK + report), Security (OWASP ZAP, dep audit), Accessibility (axe/Lighthouse), UAT (Malingi pilot). Coverage gate ≥ 80% services.

---

# 24. Deployment — see `docs/deployment.md`.
Dev/Staging/Prod; CI/CD (GitHub Actions → build → EVO VPS via DirectAdmin/SSH or Docker); Docker for any worker services; backups (PITR + cold); monitoring (Uptime + Supabase metrics + Sentry); logging (centralized); DR (RTO 4h, RPO 24h).

---

# 25. Scalability
- **100 users:** single Supabase project + 1 VPS, no caching needed.
- **1,000:** add index tuning, enable RLS efficiently, CDN for assets.
- **10,000:** read replicas, Redis cache for dashboards, queue workers separated.
- **100,000:** shard by tenant (schema-per-tenant option), horizontal Edge Functions, dedicated M-Pesa callback handler, async report generation.
- **Bottlenecks:** M-Pesa callback throughput, notification fan-out, report queries (mitigate with materialized views + async export).

---

# 26. Roadmap — see `docs/roadmap.md`.
- **Phase 1 (MVP, 6 wks):** A–G core + SMS + M-Pesa + EN + WCAG basics. (Matches your timeline.)
- **Phase 2:** email schedules, offline queue, announcements, notes, aging report.
- **Phase 3:** QR, parent self-registration, KNEC export, AI early-warning.
- **Future:** native app, full ERP modules, AI analytics.

---

# 27. Risks
| Type | Risk | Mitigation |
|---|---|---|
| Technical | M-Pesa sandbox ≠ prod drift | Test in prod-UAT; monitor callbacks |
| Technical | RLS misconfig → cross-tenant leak | RLS tests in CI; audit review |
| Business | Low parent smartphone use | SMS-first; feature-phone STK |
| Operational | Teacher adoption | Training + simple UX + offline |
| Security | Data Protection Act breach | Minimize minor data; consent; audit |
| Legal | MPESA T&Cs | Compliant paybill; reconciled ledgers |
| Financial | Churn post-founding offer | Strong onboarding; visible value |

---

# 28. Areas of Improvement (critical eval of the brief)
1. **SMS upgraded to must-have** (was optional). In Kenya, ~majority of parents are feature-phone/M-Pesa-SMS users; excluding SMS excludes the exact audience that needs visibility. Mobiwave is the single SMS provider. WhatsApp deliberately dropped from scope.
2. **Session-based attendance, not daily.** Remedial runs in sessions; a per-day model loses the remedial unit. The data model reflects sessions.
3. **Deep-linked fee payment** from SMS — a bare "you have a balance" SMS converts poorly; a "Pay KES X — tap here" STK link converts.
4. **Attendance→payment linkage:** auto-remind unpaid parents of absent-heavy students (prioritized outreach).
5. **Conflict detection with override**, not hard block — schools override; log it.
6. **Offline-first attendance** — classrooms have dead zones; queue + flush prevents data loss and teacher frustration.
7. **Audit as a first-class module**, not an afterthought — the brief sells "accountability"; make it visible to principals.
8. **Multi-tenant proofing** even for one school — the strategic note demands it; RLS from line one avoids a painful refactor.
9. **Idempotent M-Pesa reconciliation** — double-credit is the #1 payment bug; enforce by CheckoutRequestID.
10. **WCAG AA + Swahili** — "modern SaaS" in Kenya must be accessible and bilingual; cheap to do now, expensive later.

---

# 29. Documentation Deliverables (this package)
README.md, design.md, architecture.md, database.md, api.md, deployment.md, security.md, developer-guide.md, user-guide.md, admin-guide.md, testing.md, roadmap.md, CHANGELOG.md. (All produced alongside this SRS.)

---

# 30. Development Plan (high level; detail in roadmap.md)
| Milestone | Scope | Est. effort | Dep |
|---|---|---|---|
| M1 Design & data model | IA, DB, design tokens, API contracts | 1 wk | — |
| M2 Auth + tenants + RBAC | Supabase Auth, RLS, roles | 3 d | M1 |
| M3 Admin + students/teachers/groups | CRUD, import | 1 wk | M2 |
| M4 Scheduling + calendar | sessions, conflicts | 1 wk | M3 |
| M5 Attendance + lock/approve | marking, analytics | 1 wk | M4 |
| M6 Payments + M-Pesa | STK, reconcile, ledger | 1.5 wk | M3 |
| M7 Parent/Teacher portals | views, pay | 1 wk | M5,M6 |
| M8 Reports + SMS + audit | exports, notify, log | 1 wk | M5–M7 |
| M9 QA + UAT + training | pilot at Malingi | 1 wk | M1–M8 |

Total ~6 weeks. Critical path: M2→M3→M6 (payments) → M7.

---

*End of master SRS. Companion deep-dive documents expand Sections 12, 14, 15, 16/17, 18, 23, 24, 26, and the guides.*
