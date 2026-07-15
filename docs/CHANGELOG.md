# Changelog

All notable changes to the ReClass specification and system are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versions follow SemVer.

## [1.0.0] — 2026-07-12 — Planning Release (pre-development)
### Added
- Master SRS covering all 30 required sections (docs/srs.md).
- Design system (design.md): tokens, typography, components, a11y, brand voice.
- Database design (database.md): Postgres schema, RLS tenant isolation, indexes, lifecycle, retention.
- API design (api.md): REST + Edge Function endpoints, auth, idempotency, error codes.
- Architecture (architecture.md): C4 model + backend/frontend component design.
- Security (security.md): threat model, OWASP Top 10 mapping, DPA compliance.
- Deployment (deployment.md): environments, CI/CD, backups, DR.
- Testing (testing.md): unit/integration/E2E/perf/security/a11y/UAT.
- Roadmap (roadmap.md): phases, milestones, effort, dependencies, rollout order.
- Guides: developer, user, admin. README index.

### Decisions (locked)
- Multi-tenant from day one (Malingi = tenant #1).
- Supabase + Next.js + M-Pesa STK Push stack.
- SMS upgraded to must-have at go-live; Mobiwave is the sole SMS provider (WhatsApp NOT in scope).
- Session-based attendance; idempotent M-Pesa reconciliation.
- WCAG 2.1 AA + EN/SW bilingual.

### Next
- Begin Phase 1 MVP (6-week Malingi go-live). See roadmap.md.

## [1.1.0] — 2026-07-12 — Integration & Credential Model
### Added
- `integrations.md`: Mobiwave SMS/WhatsApp + Safaricom Daraja spec — endpoints, auth, STK flow, event→endpoint mapping.
- Per-tenant credential model: tenant admins store their own Daraja + Mobiwave secrets (`school_send`); super_admin sets `platform_billing` creds = Mobiwave's own account for billing/ops only (NOT a tenant fallback).
- `database.md`: `credentials` table (encrypted_blob, scope tenant|platform, RLS, KEK via Supabase Vault).
- `api.md`: `/credentials` CRUD + `/credentials/:id/test` + `resolve()` resolution rules.
- `security.md`: secret encryption/decrypt_credential SECURITY DEFINER; callback HMAC.
- `testing.md`: TC-CRED-01..04, TC-SEC-01 (credential isolation, resolution, no plaintext leakage).
- `admin-guide.md`: Credentials management section.
### Changed
- Replaced placeholder "Africa's Talking" SMS gateway with Mobiwave SMS Platform (real API).
- WhatsApp now rides Mobiwave `/sms/send` `type:"whatsapp"` (lower cost than separate provider) — still phase 2 feature, but trivial to enable.
- srs.md §19 (integrations) + §10 (business rule 13) updated for per-tenant creds.

## [1.2.0] — 2026-07-12 — Credential Purpose Correction
### Changed
- **Critical model fix:** super_admin `platform_billing` credentials are Mobiwave's OWN account for platform billing/operations — NOT a runtime fallback for schools.
- Resolution is now **strict**: tenant `school_send` prod → tenant `school_send` sandbox → else `CREDS_NOT_FOUND`. No silent use of owner paybill.
- `credentials` table gains `purpose` (`school_send` | `platform_billing`); RLS + validation enforce the split.
- Added optional **platform-managed plan** model (§4.1): owner provisions `school_send` creds *for the tenant* — explicit commercial arrangement, not a fallback.
- Updated integrations.md §4, api.md §7, database.md (DDL + RLS), security.md §5, admin-guide.md, testing.md (TC-CRED-02/02b).
- Added `migrations/` (PLANNING DRAFT, NOT applied): SQL for `credentials`+RLS+`decrypt_credential`, `resolve_credential` (strict), `reconcile_payment`; Edge Function skeletons `stk` + `mpesa-callback`.

## [1.4.0] — 2026-07-12 — Notifications finalized + chatbot removed + Edge Functions complete
### Changed
- **Chatbot removed** from AI Opportunities (§22) per direction — no conversational assistant in scope.
- **Notifications = Mobiwave SMS only** (confirmed): `notify` Edge Function fans out queued rows to Mobiwave `/sms/send` (`type:"plain"`), using the tenant's OWN `school_send` token (strict, no owner fallback); STOP opt-out + DLQ handled.
- Added Edge Function skeletons: `edge-notify.ts`, `edge-credentials-test.ts` (POST `/credentials/:id/test` → Mobiwave `/balance` + Daraja token). All 4 functions listed in migrations/README.
- CHANGELOG §22 chat reference corrected.
- Planning phase complete: 30-section SRS + 11 deep-dive docs + 3 SQL migrations + 4 Edge Function skeletons + 3 guides. Nothing applied to project `rlswdeswlkuaigwtojxw`.

## [0.8.0] — 2026-07-13 — Sprint 8 — Production Release

### Added
- Dockerfile (multi-stage, standalone output, 22-alpine)
- docker-compose.yml (health check, env_file, restart policy)
- .dockerignore (exclude dev artifacts)
- Production deployment guide (docs/deployment.md)
- Security headers: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy
- README.md with architecture, setup, and project structure

### Changed
- next.config.js: `output: 'standalone'`, security headers, CSP
- HSTS set to `max-age=63072000; includeSubDomains; preload`

## [0.7.0] — 2026-07-13 — Sprint 7 — Administration & Security

### Added
- SQL migrations applied: 18 core tables, RLS policies on all tables, credential encryption (Vault KEK), credential resolution (strict, no owner fallback), payment reconciliation trigger, invoice status trigger.
- Seed data: Malingi High School tenant, 4 subjects, 2 fee types.
- Next.js App Router scaffold with TailwindCSS + design tokens (brand indigo, school green, ink neutral palette).
- Shared UI components: Button (4 variants), Card (header/content), Input (with label+error).
- Login page at `/login` with email+password auth (Supabase Auth).
- Role-based route middleware — redirects by role (super_admin, school_admin, principal, teacher, bursar, parent).
- Dashboard layout with role-scoped sidebar nav for all 6 roles.
- Placeholder dashboard pages for all roles.
- Health check endpoint at `/api/healthz`.
- CI/CD pipeline (GitHub Actions: lint → build).
- Environment config (`.env.example`), updated `.gitignore`.
- Server-side Supabase client (`@supabase/ssr`) for middleware auth.

### Changed
- Migrated from Pages Router to App Router (`src/pages/` → `src/app/`).
- Restructured Supabase client: separate `supabase-client.ts` (browser), `supabase-server.ts` (server), `auth.ts` (shared types).
- Updated `package.json` with typecheck/test scripts.
- Removed deprecated `src/lib/supabaseClient.ts` and `src/lib/supabase.ts`.

### Infrastructure
- `tailwind.config.ts` with brand/school/ink tokens, font families, border radius, card shadows.
- `postcss.config.js` for Tailwind + autoprefixer.

## [1.3.0] — 2026-07-12 — Notifications: Mobiwave SMS only (WhatsApp dropped)
### Changed
- Notifications use **Mobiwave SMS only**. WhatsApp removed from scope across the package.
- `notifications.channel` CHECK narrowed to `(sms,email,inapp)`; removed `whatsapp`.
- integrations.md rewritten: Mobiwave SMS Platform (SMS only), removed §2.3 WhatsApp, send examples use `type:"plain"`.
- srs.md (§5, §19, §20 table, §22 AI Opportunities, §26/§28 roadmap), architecture.md (containers/components), roadmap.md (Phase 2), persona (Achieng) updated. (Chatbot noted in §22 at that point; removed in v1.4.)
- Email remains should-have (SMTP/Mailgun), separate from Mobiwave.


