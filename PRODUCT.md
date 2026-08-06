# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Six roles serve the whole school ecosystem — no single hero user:

| Role | Situation and job |
|---|---|
| `super_admin` | Platform operator: tenant overview, selective audit-log view, tenant impersonation |
| `school_admin` | School operational manager: students, parents, teachers, users/roles, subjects, schedules, attendance, fees, invoices, reconciliation, payroll, credentials, settings, reports/CSV, notifications, messages, exams/results |
| `principal` | School leader: teacher-attendance review, reports, program-effectiveness views |
| `teacher` | Educator: assigned timetable and teacher-attendance marking |
| `bursar` | Financial officer: revenue, receivables aging, waivers, invoice/export views |
| `parent` | Guardian: linked-child timetable, fees, STK payment initiation, payment/invoice history, messages, academic results |

## Product Purpose

eShule is a multi-tenant school management SaaS for Kenyan schools. It covers the full school administration suite — students, parents, teachers, scheduling, fees, payroll, M-Pesa payments, SMS notifications, messaging, and exam results — with a primary focus on remedial-class management and student recovery programs.

Success means a school can run its entire operation through eShule: from scheduling remedial sessions, to tracking attendance, to collecting fees via M-Pesa, to communicating with parents, to reporting on student progress.

## Positioning

Full-suite school management with remedial-class management as a first-class feature — not an afterthought. Built for the African school context with native M-Pesa integration, not adapted from a Western template.

## Operating Context

- Kenyan school environment: M-Pesa payments (Safaricom Daraja API), Mobiwave SMS, mobile-first parent experience
- Multi-tenant architecture: one Supabase project, row-per-tenant PostgreSQL, application-level tenant isolation
- Modular monolith: SvelteKit web app + Supabase Edge Functions for payments/SMS
- Pre-production status: audit-tracked, 138 tests passing, not deployment-proven
- Bilingual history: English primary, Swahili support removed 2026-08-05

## Capabilities and Constraints

**Implemented:**
- Students, parents, teachers, users/roles management
- Scheduling and timetable (including remedial sessions)
- Teacher attendance marking and review
- Fees, invoicing, waivers, reconciliation
- M-Pesa STK payment initiation and callback processing
- SMS notifications (Mobiwave)
- Parent messaging
- Exam results and academic records
- Reports and CSV export
- Tenant impersonation (super_admin)
- Audit logging

**Constraints:**
- No versioned public REST API — form actions + RPC only
- No student login
- No reliable offline attendance
- No complete consent/STOP workflow
- Supabase service-role client used broadly (bypasses RLS) — tenant isolation depends on application convention
- No production-proven deployment
- No implemented AI feature

**Undecided:**
- Deployment target (Vercel adapter present, Docker path exists but unusable, VPS mentioned in audit)
- Public API roadmap
- Student-facing login

## Brand Commitments

- Name: **eShule**
- Voice: Kenya-first, plain language, English
- No logo or visual identity assets confirmed in repository

## Evidence on Hand

- Repository: `D:\Projects\eShule` — SvelteKit 2/Svelte 5 multi-tenant school admin app
- Live Supabase project: ReClass, ref `rlswdeswlkuaigwtojxw`, region `eu-west-1`
- Remote: `https://github.com/malingib/ReClass.git`
- 138 tests passing, svelte-check 0 errors, lint 0 errors
- 8 migrations applied to live DB
- 5 audit findings resolved (scheduling conflicts, bank idempotency, comms CTAs, reports filters, HR exclusion)
- Audit docs: `AUDIT-2026-08.md`, `FINAL_REPORT.md`, `ARCHITECTURE.md`, `API.md`, `DATABASE.md`, `SECURITY.md`, `DEPLOYMENT.md`, `OPERATIONS.md`
- Design system doc: `docs/DESIGN.md`

## Product Principles

1. **Remedial-first, not remedial-only.** Remedial-class management is the primary focus, but the full school suite must work as a coherent whole.
2. **Kenya-native integration.** M-Pesa and SMS are first-class, not bolted on. Payment and communication flows must work for Kenyan schools without adaptation.
3. **Tenant isolation is non-negotiable.** Every query, mutation, and check must respect the active tenant. Application-level conventions must be enforced, not trusted.
4. **School ecosystem, not single user.** The product serves six roles that must coexist. No role's experience should be degraded to serve another.
5. **Audit-tracked, not audit-avoidant.** Security findings are resolved, not deferred. The product is pre-production and honest about it.

## Accessibility & Inclusion

- WCAG 2.1 AA target (from DESIGN.md)
- Mobile-first parent experience (parents primarily access via mobile)
- No student-facing accessibility requirements (no student login)
