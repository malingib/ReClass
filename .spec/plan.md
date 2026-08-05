# eShule — Technical Plan

Stack (unchanged): SvelteKit 5 (routes under `src/routes/`), Supabase (Postgres + RLS),
TailwindCSS 4, Vercel adapter, Zod v3 + plain form actions, bits-ui v1 Dialogs,
service-role client (`locals.srv`) + explicit `.eq('tenant_id')`.

## Architecture decisions

### AD-1: Module provisioning model
- Static catalog: `suiteModules` in `packages/shared/src/lib/modules.ts` (id, name,
  description, status, href, icon, accent) — the *definition* of every module.
- Per-tenant enablement: new `tenant_modules` table. Query helper
  `getEnabledModules(srv, tenantId): Promise<string[]>` in
  `src/lib/server/_platform/modules.ts` — returns enabled module ids; super_admin
  returns all; missing rows → all available (fail-open so fresh tenants see everything
  until provisioned).
- `hooks.server.ts` populates `locals.enabledModules: string[] | null` (null = all).
- AppShell: filter `roleNav` groups by `navGroupModule[group] ∈ enabledModules` (or
  all when null / super_admin). Module picker: `suiteModules.filter(m => enabled)`.
- `ROUTE_MODULE` stays complete (routes exist regardless); the sidebar filter is the
  enforcement point. A disabled module's routes still 404-guard via role guard, not
  module check (acceptable v1).

### AD-2: `/admin` launcher
- `src/routes/(app)/admin/+page.server.ts` → `redirect(303, '/admin/modules')`.
- Delete `src/routes/(app)/admin/+page.svelte` (old dashboard) and the
  `getAdminDashboardStats` usages; keep the server helper file only if referenced by
  Reports — audit first (it is referenced by `_remedial/dashboard.ts` for
  `computeTrend`/`buildActivityFeed`, so KEEP those exports, drop the stat assembly).
- `/admin/modules` picker now filters by enabled modules.

### AD-3: eShule rename
- `packages/shared/package.json` name → `@eshule/shared`; root `package.json`
  workspace dep → `@eshule/shared`; 17 import sites `@reclass/shared` → `@eshule/shared`.
- `src/app.html` title → "eShule"; login footer, `+error.svelte`, `not-provisioned`,
  AppShell user fallback, `_remedial/dashboard.ts` comments, teacher page string.
- `.spec/` docs + README headers: platform = eShule.

### AD-4: Payroll domains
- Migration: `ALTER TABLE payroll_runs ADD COLUMN domain text NOT NULL DEFAULT
  'remedial' CHECK (domain IN ('school','remedial')); ADD COLUMN salary_amount numeric;`
  backfill: `UPDATE payroll_runs SET domain='remedial' WHERE domain IS NULL` (default
  handles it). `ALTER TABLE teachers ADD COLUMN salary_monthly numeric;`.
- `_finance/payroll.ts`: split into `generateRemedialPayroll()` (existing logic, writes
  domain='remedial') and `generateSchoolPayroll(srv, tenantId, period)` (reads
  teachers.salary_monthly > 0, writes payroll_runs domain='school',
  amount=salary_monthly, occurrences_count=1, rate_per_session=null).
- Routes: finance payroll at `/admin/finance/payroll` (domain='school'); remedial
  payroll stays `/admin/payroll` (domain='remedial'). Both filter `.eq('domain', x)`.
- Nav: "Payroll" link in School fees group → `/admin/finance/payroll`; Remedial group
  "Teacher payroll" → `/admin/payroll`.

### AD-5: Receipts domains
- Existing `/admin/receipts` list becomes domain-scoped: finance receipts
  `/admin/finance/receipts` (`.eq('domain','school')`), remedial receipts
  `/admin/remedial/receipts` (`.eq('domain','remedial')`). Print endpoint unchanged
  (prints by id, shows channel-specific fields).
- Move/extend the receipts page server file to a shared `getReceipts(srv, tenantId,
  domain)` helper; two thin routes. Nav links updated.

## File map

| Change | Files |
|---|---|
| Migration | `supabase/migrations/20260802000002_eshule_modules_payroll_domains.sql` |
| Shared pkg | `packages/shared/package.json`, `packages/shared/src/lib/modules.ts` (rename only), root `package.json` |
| Types | `src/lib/supabase/database.types.ts` (tenant_modules Row/Insert/Update/Relationships, payroll_runs.domain/salary_amount, teachers.salary_monthly) |
| Server helpers | `src/lib/server/_platform/modules.ts` (new), `_finance/payroll.ts` (split), `_finance/receipts.ts` (new or extend) |
| Hooks | `src/hooks.server.ts` (populate locals.enabledModules) |
| Routes | `admin/+page.server.ts` (redirect), `admin/modules/+page.svelte` (filter), `(finance)/payroll`, `(finance)/receipts`, `(remedial)/receipts`, super-admin `modules` page |
| Nav | `AppShell.svelte` (enabled filter + new links) |
| Docs | `.spec/*`, README platform name |

## Sequencing
1. Migration + types (foundation)
2. Shared pkg rename + import sweep
3. modules server helper + hooks + AppShell filter
4. `/admin` redirect + picker filter + nav group fixes
5. Payroll split (finance + remedial)
6. Receipts split
7. Super-admin provisioning UI
8. Gate: check + build + test + lint; push live; commit
