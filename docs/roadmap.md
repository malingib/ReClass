# ReClass — Roadmap & Development Plan (Sections 26 & 30)

## Phasing (aligned to Malingi 6-week founding timeline)
### Phase 1 — MVP (Weeks 1–6)  ⭐ Malingi go-live
- W1: Planning/data model/IA/design tokens/API contracts (M1)
- W2: Auth + tenants + RLS + RBAC (M2); Admin CRUD + bulk import (M3)
- W3: Scheduling + calendar + conflict detect (M4); Attendance mark/lock/analytics (M5)
- W4: Payments + M-Pesa STK + reconciliation + ledger (M6)
- W5: Parent + Teacher portals (M7); Reports + SMS + audit (M8)
- W6: QA + UAT pilot + training + go-live (M9)
**Must-have scope only** (MoSCoW). EN + SMS + M-Pesa.

### Phase 2 — Engagement (Months 2–3)
- Email schedules, scheduled report emails, announcements, notes upload, offline attendance queue, payment-aging report, opt-out UI, public-holiday calendar.

### Phase 3 — Intelligence (Months 4–6)
- QR check-in, parent self-registration (OTP), KNEC/EMIS export, AI early-warning (absence + fee-default risk), NLP monthly summaries.

### Future
- Native mobile app; full school ERP (admissions, exams/grading, library, hostel, transport, inventory); online learning; AI performance analytics; multi-currency for non-KE schools.

## Milestones / Effort / Dependencies (summary)
| Milestone | Effort | Dep | Critical path |
|---|---|---|---|
| M1 Design/model | 1 wk | — | start |
| M2 Auth/tenants | 3 d | M1 | yes |
| M3 Admin CRUD | 1 wk | M2 | yes |
| M4 Scheduling | 1 wk | M3 | |
| M5 Attendance | 1 wk | M4 | |
| M6 Payments/M-Pesa | 1.5 wk | M3 | yes |
| M7 Portals | 1 wk | M5,M6 | |
| M8 Reports/SMS/audit | 1 wk | M5–M7 | |
| M9 QA/UAT/training | 1 wk | M1–M8 | end |

## Implementation Order (recommendation)
1. Stand up Supabase project + RLS scaffold + seed (de-risk isolation first).
2. Auth + roles (everything hangs off identity).
3. Domain CRUD (students/teachers/groups) — unblocks everything.
4. Scheduling → Attendance (core daily value).
5. Payments (highest risk: M-Pesa) — start integration early, parallel-track with portals.
6. Portals + Reports + SMS + Audit.
7. Hardening: tests, a11y, security scan, UAT.

## Revenue Expansion Path (Mobiwave)
- Founding partner Malingi (owned or SaaS). Each new school = tenant onboarding (config + import), not rebuild. SaaS @ KES 10k/mo compounds; owned @ 150k + 30k/yr maintenance. Productized onboarding checklist reduces marginal delivery cost.
