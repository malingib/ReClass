# eShule — Specification

## Context

The app (currently branded "ReClass") is a multi-tenant school platform. The user has
decided:

1. **The platform is called eShule.** "ReClass" as a platform name is gone. The
   remedial module keeps its domain identity (remedial/ReClass *module*), but the
   product/platform is eShule.
2. **`/admin` is a pure module launcher.** No school-wide dashboard mixing domains.
   Landing at `/admin` redirects to the module picker.
3. **Modules are extensible and super-admin provisioned.** The super admin decides
   which modules a tenant gets. Modules are not hardcoded-all-visible; they are
   registered in a registry and enabled per tenant.
4. **Each domain has its own payroll.** Finance (school) payroll = direct payments to
   B.O.M.-employed teachers (salary). ReClass (remedial) payroll = per-session rate ×
   approved attendance. Two independent payroll surfaces, each reading its own data.
5. **Each domain has its own receipts.** Finance receipts (bank/KCB, school domain)
   and ReClass receipts (M-Pesa, remedial domain) are separate lists/views filtered
   by `domain` + `method`.

## Requirements

### R1 — Platform rename: eShule
- User-facing strings "ReClass" → "eShule" where they refer to the platform: app.html
  title, login page footer/title, error pages, AppShell user fallback, docs headers.
- Internal package `@reclass/shared` → `@eshule/shared` (package.json workspace +
  all imports).
- The *remedial module* may retain remedial wording ("Remedial", "ReClass" module id
  `reclass` stays as a module id — ids are internal; display names are user-facing).
  Display name for the remedial module: "Remedial (ReClass)" is acceptable; the
  platform name eShule must not collide with a module name. Decision: module display
  name stays "ReClass" as the remedial product name, platform is eShule. Update
  descriptions to avoid "platform" claims.

### R2 — `/admin` is a pure module launcher
- GET `/admin` → `redirect(303, '/admin/modules')`.
- `/admin/modules` stays the module picker grid (renders provisioned modules only).
- The old school-dashboard stats page (`getAdminDashboardStats`, `/admin/+page.svelte`
  KPI cards) is removed. Cross-module reporting lives in Reports.
- Nav: the school_admin "Front office" group loses the Overview link to `/admin`; the
  top-level nav lands on the module picker.

### R3 — Extensible, super-admin-provisioned modules
- New table `tenant_modules` (tenant_id, module_id, enabled, config jsonb, timestamps)
  with RLS + tenant policy + updated_at trigger + unique(tenant_id, module_id).
- Module catalog moves to a server-side registry (single source of truth) derived from
  `suiteModules` + per-tenant `tenant_modules` rows. A tenant sees a module only if
  enabled.
- Super-admin UI: `/super-admin/modules` lists tenants × modules with enable toggles
  (super-admin only, system table — no tenant filter).
- Default: existing tenants get all current available modules enabled (backfill seed
  in migration).
- `hooks.server.ts`/layout loads enabled module ids into `locals.enabledModules`;
  AppShell + module picker filter by them. ROUTE_MODULE/navGroupModule stay but are
  filtered: groups belonging to a disabled module are hidden.
- `supabase_admin` (super_admin role) bypasses the filter (sees all).

### R4 — Per-domain payroll
- Data: `payroll_runs` gains `domain text NOT NULL DEFAULT 'remedial'` (school /
  remedial) + `salary_amount numeric` for school salary runs. `teachers` gains
  `salary_monthly numeric` for B.O.M. teachers.
- Finance payroll page (`/admin/finance/payroll`): generates/views school-domain runs
  — teacher salary × period. Remedial payroll (`/admin/remedial/payroll` or the
  existing `/admin/payroll`): per-session runs from approved attendance, unchanged.
- Both pages read `payroll_runs` filtered by their `domain`; each lists only its own.
- Nav: "Payroll" appears in BOTH School fees (finance) and Remedial (reclass) groups,
  pointing to domain-specific payroll routes.

### R5 — Per-domain receipts
- Receipts list filtered by domain: Finance receipts = `payments` where
  `domain='school'` (bank/KCB + any school M-Pesa); ReClass receipts =
  `domain='remedial'` (M-Pesa).
- Routes: `/admin/finance/receipts` (school) and `/admin/remedial/receipts` (remedial).
  Print endpoint `/admin/receipts/[id]/print` stays (prints any receipt by id).
- Nav: "Receipts" in both School fees and Remedial M-Pesa groups.

### R6 — Non-goals
- No new invoice/balance lifecycle. Payments remain receipts.
- No changes to the attendance/session model.
- No module *creation* UI yet — only provisioning of existing modules per tenant.

## Acceptance criteria
- [ ] `npm run check` 0 errors; `npm run build` passes; `npm test` green.
- [ ] `/admin` redirects to `/admin/modules`; picker shows only enabled modules.
- [ ] Super admin can toggle a tenant's modules; picker + sidebar react.
- [ ] Finance payroll shows only school runs; remedial payroll only remedial runs.
- [ ] Finance receipts show only school-domain payments; remedial receipts only M-Pesa
      remedial payments.
- [ ] No user-facing "ReClass" as platform name remains (grep for platform-context uses).
- [ ] Live DB: migration pushed; `tenant_modules` exists; payroll_runs has domain.
