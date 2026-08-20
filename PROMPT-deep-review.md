# Deep Review Prompt — ReClass / eShule

> Copy-paste this entire prompt into any frontier LLM (Claude, GPT-4o, Gemini) with the repository attached/uploaded. It is tailored to this specific codebase.

---

## ROLE
You are a **Staff Engineer + Security Auditor + Product Reviewer** conducting an **implementation-grounded deep review** of this repository. You do not hallucinate. You only claim what you can prove from files, configs, migrations, or command output in the repo. Inferred risks must be labeled as such.

## PROJECT CONTEXT
- **Name:** eShule / ReClass — multi-tenant school management SaaS for Kenyan schools
- **Stack:** SvelteKit 2 + Svelte 5 + TypeScript 5 + Vite 6 + Tailwind 4 + bits-ui + Zod 3 | Supabase Auth / PostgREST / PostgreSQL 17 / RLS / Vault / pg_cron / pg_net | Supabase Edge Functions (Deno) | Vercel adapter (authoritative) + conflicting Dockerfile
- **Roles:** `super_admin`, `school_admin`, `principal`, `teacher`, `bursar`, `parent` (NO student login)
- **Core domains:** Tenancy/auth, students/parents/teachers/guardians_link, subjects/sessions/occurrences, teacher_attendance/payroll, fee_types/invoices/payments/waivers/checkout_requests, notifications/messages, exams/exam_results, credentials, audit_log
- **Integrations:** Safaricom M-Pesa Daraja STK + callback, Mobiwave SMS, Sentry (optional)
- **Status claimed in docs:** `0.2.0`, shippable for current feature set per `AUDIT-2026-08.md` but deployment-blocked pending P0 gates. Verify independently.
- **Authoritative docs (truth tier 1):** `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `AUDIT-2026-08.md`, `FINAL_REPORT.md` (root, dated)
- **Historical docs (tier 2, do NOT trust as fact):** `docs/*.md` — contains drift (claims Next.js, public /v1 API, offline queues, hard RLS, Docker Compose that do not exist)

## OBJECTIVE
Perform a **full-stack deep review** that answers: *Is this shippable to handle real schools, real money, and real children's data?* Provide evidence, severity, and a sequenced remediation plan.

## EVIDENCE STANDARD
- Cite exact paths with line numbers: `src/routes/(app)/admin/.../+page.server.ts:34` — not vague references.
- Distinguish **observed fact** (in file), **reproduced result** (you ran it), and **inferred risk**.
- If hosted Supabase/Vercel state is not in repo, say "not evidenced in source — requires live verification".
- Do not trust comments/labels — verify behavior (e.g., `encrypted_blob` input that is actually plaintext, `app.tenant_id()` that is undefined).

## REVIEW DIMENSIONS — COVER ALL 18

### 1. Discovery & Inventory
Enumerate actual routes, server modules (`src/lib/server/*`), Edge Functions (`supabase/functions/*`), migrations (32 files), explicit HTTP handlers, cron jobs, and test files. Flag dead/duplicate artifacts (`database.types.ts` stale `attendance`, `impersonation_tokens` unused, `SECRET_KEY`, stale `supabase/config.toml` project id, Vercel vs Docker conflict).

### 2. Architecture
Map container, layer, folder, request, auth, and queue diagrams. Validate against `ARCHITECTURE.md`. Assess modular-monolith fit, partial domain-service extraction, direct `locals.srv` usage, and target scaling architecture. Highlight single points of failure.

### 3. Tenant Isolation (CRITICAL)
- Service-role bypass: `src/lib/supabase/server.ts:21-25`, `src/hooks.server.ts:27-36` — every `locals.srv.from()` must have `.eq('tenant_id', ...)`.
- Run mental `verify_tenant_isolation.py` scan: list any unscoped chains.
- Cross-tenant FK gap: most FKs are ID-only, not composite `(tenant_id, id)` — enumerate vulnerable joins (invoices→students, payments→invoices, sessions→teachers/subjects, messages→profiles, exam_results→exam/student/subject).
- RLS incoherence: `current_setting('app.tenant_id')` vs undefined `app.tenant_id()` in `20260722000006_create_messages.sql:19-20` and `20260722000007_create_exams.sql`
- Recommend: JWT-claim RLS (preferred) OR centralized privileged data layer + composite FKs + `FORCE RLS`.

### 4. Security (OWASP Top 10 2021)
Audit each OWASP category against `SECURITY.md` findings SEC-001 to SEC-015:
- SEC-001 Critical: credential plaintext mislabeled as `encrypted_blob` (`admin/credentials/+page.*`, `src/lib/server/credentials.ts`, never calls `encrypt_credential`)
- SEC-002/003/005: service-role default, academic replacement (`admin/academic/[examId]/edit/+page.server.ts` delete-then-insert, no tenant validation), parent messaging (`parent/messages/+server.ts` no ownership)
- SEC-004: optional `MPESA_CALLBACK_SECRET` (`mpesa-callback/index.ts:5-14`)
- SEC-006: unbounded student import (`admin/students/import/+page.server.ts`)
- SEC-007: process-local rate limits (`src/lib/server/rate-limit.ts`)
- SEC-008/010: sparse audit_log, impersonation lacks `Secure`, target validation, revocation (`impersonation.ts`, `super-admin/tenants`)
- SEC-011: CSV formula injection (`src/lib/server/csv.ts`)
- Check CSP/headers (`middleware.ts:92-99`), CSRF (GET `/api/logout`), XSS (`{@html}` in `AppShell.svelte`), secrets handling, session/MFA.

### 5. Database
- Migration replay: prove `supabase db reset` would fail at messages/exams policies. Check patch-on-patch history (attendance dropped/restored/dropped, group_members collapsed).
- Schema: final ERD, keys, checks, cascades (dangerous `students→invoices→payments` cascade), indexes (missing composite tenant-leading, duplicate names, no `CONCURRENTLY`).
- Transactions: strengths `reconcile_payment`/`grant_waiver` locks vs gaps (STK saga, `checkout_requests` no partial unique, `payment-reminders` split update+insert, `notify` no `FOR UPDATE SKIP LOCKED`/`next_retry_at` filter, bulk invoices no idempotency, `amount_paid` trigger only on insert).
- Assignments: backup/PITR, `cleanup_notifications(90)` deletion vs archive, retention, immutability, stale types. Run supplied `DATABASE.md §13` verification queries mentally.

### 6. API & Integrations
No versioned public REST API. Audit SvelteKit form actions, `/api/healthz` (shallow, authenticated), `/api/logout` (GET), `/parent/messages` POST-JSON, 6 CSV exports, 5 Edge Functions. Check: envelope/codes, idempotency, pagination contract, method allowlist, body limits, timeouts, distributed limits, request-ID propagation. Payment flow idempotency & callback trust. SMS queue semantics.

### 7. Backend / Server Layer
Assess `src/lib/server/*` modularity vs routes bypassing services, `any` types, error leakage (`error.message` exposed), logging (request-id, single JSON helper, no structured correlation).

### 8. Frontend / UX / A11y
Svelte 5 runes, `AppShell`, `DataTable`, Tailwind. Check repeated form markup, `DataTable.svelte`/`credentials`/`bursar` a11y warnings (11 warnings from `svelte-check`), `{@html}` surfaces, localStorage notification reads, no `axe`/`Lighthouse`/keyboard/screen-reader evidence — cannot claim WCAG 2.1 AA.

### 9. Code Quality
Score 0-100 (higher healthier): Readability, Maintainability, Complexity, Naming (`encrypted_blob`, `PUBLIC_URL`), Modularity, DRY, SOLID, Clean Architecture, Testability, Reusability, Type Safety, Error Handling, Logging, Documentation. Justify with file evidence.

### 10. Testing & Quality Gates
Current: `vitest` 154 tests / 16 files (per README) or 81 tests / 8 files (per FINAL_REPORT date) — note delta — plus `svelte-check`, `eslint`, `build`, CI `.github/workflows/ci.yml` (no DB, no Playwright, no `npm audit`). Playwright `e2e/` exists but not in CI. Identify missing: `supabase db reset` gate, RLS denial tests, concurrent payment/waiver/checkout tests, Edge contract tests, E2E denial flows, coverage, a11y, load, DAST, restore drills. Explain why regex migration tests pass while replay fails.

### 11. Performance & Scalability
Positives: `Promise.all`, `paginatedQuery`, payroll RPC, batched reminders. Gaps: unbounded loads (silent 1k `max_rows` truncation), offset pagination, full-memory CSV/import buffering, in-memory dashboards/threads, sequential `notify` (100 limit, no claim), per-notification credential decrypt, no cache/pool/timeout telemetry. Chunk size ~227kB raw/60kB gzip — no budget. Demand `pg_stat_statements` + `EXPLAIN (ANALYZE, BUFFERS)` before index advice.

### 12. DevOps / Deployment
CI-only `npm ci/lint/typecheck/test/build`. No IaC, no immutable promotion, no migration deploy, no rollback proven. `svelte.config.js` = `adapter-vercel` vs `Dockerfile:6-13` mutating to `adapter-node` + `npm install` + root user + no `.dockerignore` + no Compose. Health is shallow. Cron/Vault secrets manual. Sentry optional.

### 13. AI Readiness
No LLM/vector/prompt implementation. Score AI readiness and list prerequisites before any AI touches grades/payments/attendance (governance, opt-in, isolation, eval, human-in-loop, kill switch).

### 14. Documentation
Root dated audits = authoritative, extensive. `docs/` = historical drift. Score drift risk and label what to archive.

### 15. Product & Commercial
Six-role coverage vs gaps: onboarding, guardian linking workflow, consent/STOP/quiet hours, announcements, holiday exceptions, substitutes, scheduled/PDF reports, queue DLQ, audit immutability, export/offboarding, bilingual/a11y completion, offline (defer until correctness). Assess premium/analytics/monetization readiness — not ready to charge: no server entitlements, metering, dunning.

### 16. Technical Debt Register
Prioritize P0→P3 with Effort / Business impact / Engineering impact (use table from FINAL_REPORT §18).

## OUTPUT FORMAT — STRICT

### A. Executive Verdict (≤10 lines)
Shippable? Score 0-100 overall + Production Readiness 0-100 + Technical Debt Score (100=healthy). One-sentence blocker summary.

### B. Scorecard (0-100)
Product breadth | Architecture | Code quality | Security | Database | API | Frontend | Testing | Performance | Scalability | DevOps | Docs | AI readiness | Tech Debt | Overall

### C. Top 10 Risks (prioritized, with Severity Critical/High/Medium/Low, Evidence `path:line`, Exploit sketch, Impact)

### D. Detailed Findings by Dimension (§1-16)
For each: Strengths (bullets with evidence) → Weaknesses/Bugs (bullets with `path:line`) → Target Recommendation.

### E. Migration & Replay Verdict
Can `supabase db reset` succeed? What hosted state must be inventoried? Forward-fix vs squash plan (expand/backfill/validate/contract, preserve upgrade path).

### F. Security Release-Blocking Checklist (checkboxes, same as SECURITY.md blockers)

### G. Sequenced Action Plan
- Next 24h (freeze, inventory, repro failure)
- Next Week (repair replay, credential encryption, DB CI, deployment path)
- Next Month (privileged layer, composite FKs, transactional academic/financial, atomic queue, distributed limits, readiness/metrics)
- Next Quarter (pagination/SQL, audit/PITR/offboarding drills, WCAG/E2E)

### H. Verification Commands to Run
List exact commands the human should run to prove fixes (e.g., `supabase db reset` twice, `scripts/verify_tenant_isolation.py src`, `npm run check`, `npm test`, `npm run build`, `npm audit`, `npx playwright test`, `EXPLAIN` queries, cross-tenant curl/Playwright denial scripts).

## RULES
- Be ruthlessly evidence-grounded. No invented file paths.
- If uncertain, say "not evidenced — verify live".
- Do not suggest microservices until correctness/telemetry are proven.
- Do not propose indexes without `EXPLAIN` validation.
- Keep tone direct, technical, audit-grade. No fluff.
- End with: "Files to read first: `AUDIT-2026-08.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `FINAL_REPORT.md`, `src/hooks.server.ts`, `src/lib/supabase/server.ts`, `supabase/migrations/`"

---

## OPTIONAL: EXECUTION VARIANT
If you want the reviewer to also *run* checks, prepend:
> You have bash access. Run `npm run lint && npm run check && npm test -- --run && npm run build` and `python3 scripts/verify_tenant_isolation.py src` (if present), and report observed results before scoring.

## OPTIONAL: DIFF-AWARE VARIANT
For PR review, append:
> Scope to the diff plus 2-hop dependency impact. Only score changed dimensions, but always re-check tenant isolation and migration replay if `supabase/migrations/*` or `src/lib/server/*` or `src/routes/*` changed.
