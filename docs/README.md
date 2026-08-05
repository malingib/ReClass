# ReClass — Documentation Package

**Remedial Classes Management System** by Mobiwave Innovations Ltd
Anchor tenant: **Malingi High School** (Founding Partner)

A secure, multi-tenant, mobile-first web platform that digitizes remedial-class
scheduling, attendance, M-Pesa fee collection, parent communication, and management
reporting. Built with SvelteKit + Supabase + M-Pesa Daraja, deployed on Vercel.

---

## Package Contents
| Doc | What it covers |
|---|---|
| `srs.md` | **Master SRS** — all 30 sections (exec summary → dev plan) |
| `design.md` | Design system: tokens, type, components, a11y, brand voice |
| `database.md` | Postgres schema, RLS, indexes, lifecycle, retention |
| `api.md` | REST/Edge Function API: auth, endpoints, errors, idempotency |
| `integrations.md` | Mobiwave SMS + Safaricom Daraja: endpoints, creds resolution, mapping (WhatsApp NOT in scope) |
| `migrations/` | Build-ready SQL + Edge Function drafts (NOT applied; planning artifacts) |
| `architecture.md` | C4 model + backend/frontend component architecture |
| `security.md` | Threat model, OWASP Top 10, auth, encryption, DPA compliance |
| `deployment.md` | Dev/staging/prod, CI/CD, backups, DR |
| `testing.md` | Unit/integration/E2E/perf/security/a11y/UAT strategy |
| `roadmap.md` | Phases, milestones, effort, dependencies, rollout order |
| `guides/developer-guide.md` | Set up, conventions, how to build |
| `guides/user-guide.md` | Teacher/parent how-to |
| `guides/admin-guide.md` | Admin/super-admin operations |
| `CHANGELOG.md` | Version history |

## Locked Decisions
- Multi-tenant from day one (`school_id` + RLS). Malingi = tenant #1.
- Supabase backend; SvelteKit/Svelte 5/TS/Tailwind frontend; M-Pesa STK Push core.
- SMS = **must-have** at go-live (upgraded from brief's "optional"); Mobiwave is the sole SMS provider. WhatsApp NOT in scope.
- Session-based attendance (not daily); idempotent M-Pesa by CheckoutRequestID.
- WCAG 2.1 AA + EN/SW bilingual.

## Quick Start (dev)
```
supabase start            # local stack
cp .env.example .env.local
npm install
npm run dev               # Vite development server (normally :5173)
```
See `guides/developer-guide.md` for full setup, DB migrations, and Edge Function deploy.

## Status
Implementation is in progress. This package tracks the intended product and current architecture.
- 30-section SRS + 11 deep-dive docs + 3 SQL migrations + 4 Edge Function skeletons
  (`stk`, `mpesa-callback`, `notify`, `credentials-test`) + 3 guides.
- WhatsApp NOT in scope; notifications = Mobiwave SMS only (no chatbot).
- Per-tenant `school_send` vs super_admin `platform_billing` credential model (no owner fallback).
- Migration drafts require review and explicit authorization before application to Supabase.
