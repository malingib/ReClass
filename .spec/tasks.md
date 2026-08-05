# eShule — Tasks

Ordered, independently testable tasks. Gate after each: `npm run check` (scoped) +
`npm test`.

## T1 — Migration + types (foundation) ✅
- [x] `20260802000002_eshule_modules_payroll_domains.sql`:
  - [x] `tenant_modules` table (tenant_id, module_id, enabled, config, timestamps;
        UNIQUE(tenant_id,module_id)); RLS + tenant policy; updated_at trigger; index.
  - [x] `payroll_runs.domain` (school/remedial) + `salary_amount`.
  - [x] `teachers.salary_monthly`.
  - [x] Backfill: all tenants × 5 modules enabled (reclass, sis, finance,
        communications, reports — NOT payroll (merged) or platform (infra)).
- [x] Patch `database.types.ts`.
- [x] `npm run check` clean.

## T2 — eShule package rename ✅
- [x] `packages/shared/package.json` → `@eshule/shared`; root workspace dep; 17+
      import sites swept (`vite.config.ts`, `src/lib/*`, shared pkg).
- [x] `npm install` relink; `npm run check` clean.

## T3 — Enabled-modules plumbing ✅
- [x] `src/lib/server/_platform/modules.ts`: `getEnabledModules(srv, tenantId, role)`
      → null (super_admin / no rows = all) | string[].
- [x] `hooks.server.ts` (via `_auth/middleware.ts` resolveSession) populates
      `locals.enabledModules`; `app.d.ts` + `(app)/+layout.server.ts` pass through.
- [x] AppShell filters NAV groups by `navGroupModule[group] ∈ enabledModules`.

## T4 — `/admin` launcher + nav fixes ✅
- [x] `admin/+page.server.ts` → `redirect(303, '/admin/modules')`; dashboard page
      deleted; `admin-dashboard.ts` trimmed to `computeTrend`/`buildActivityFeed`.
- [x] Picker filters by enabled modules.
- [x] Nav registry: students/teachers/parents/subjects → sis; credentials/settings/
      notifications/users → platform; payroll → reclass (remedial) + finance (school);
      receipts → finance (school) + reclass (remedial); module id
      `student-information` → `sis`; standalone `payroll` module removed.

## T5 — Per-domain payroll ✅
- [x] `_finance/payroll.ts`: `getPayrollRuns(sb, tid, domain)`,
      `generateRemedialPayroll` (per-session, domain=remedial),
      `generateSchoolPayroll` (salary_monthly > 0, domain=school).
- [x] Finance payroll `/admin/finance/payroll` (school runs + generate form).
- [x] Remedial payroll `/admin/payroll` (moved to `(remedial)` group, domain-filtered).

## T6 — Per-domain receipts ✅
- [x] `_finance/receipts.ts`: `getReceipts(sb, tid, domain)`.
- [x] `/admin/finance/receipts` (school), `/admin/remedial/receipts` (remedial);
      shared `ReceiptsManager.svelte`; print endpoint unchanged.

## T7 — Super-admin module provisioning UI ✅
- [x] `/super-admin/modules` page: tenants × modules toggle switches; upsert action.
- [x] super_admin nav "Module provisioning" link.
- [x] `tenant_modules` added to isolation-script GLOBAL_TABLES (system table).

## T8 — Gate, live push, commit ✅
- [x] `npm run check` 0/0; `npm run build`; `npm test` 103 pass; lint 0 errors.
- [x] `supabase db push` (fixed COALESCE text/uuid → plain current_setting form);
      live-verified tenant_modules rows + payroll_runs.domain.
- [x] Committed `4b663cd`.
