# Scope: Collapse Multitenancy → Single-Tenant (ReClass / eShule)

## Confirmed facts (live, 2026-08-14)
- Live project has **exactly ONE tenant**: "Malingi High School"
  (`11111111-1111-1111-1111-111111111111`). Zero cross-tenant data to lose.
- Code is deeply tenant-shaped: 479 `tenantId` refs, 439 `tenant_id` DB filters,
  48 `requireTenantRole`/`requireTenant` calls, 11 impersonation refs, 5
  `set_tenant_context`/`bindTenantContext` refs.

## Decision required: Option A vs Option B
- **A (recommended — collapse to constant):** `tenant_id` becomes a hard-coded
  `TENANT_ID` constant; `locals.tenantId` always that value. Keep all
  `tenant_id` filters (harmless, always match). REMOVE only the tenant-ADMIN
  machinery: impersonation, module provisioning/gating, `set_tenant_context`
  RPC, `not-provisioned` route, super-admin tenant switching. Roles stay.
  Low risk (~10 files), no DB schema change, reversible.
- **B (full strip):** drop `tenant_id` columns from every table (migration),
  delete all 439 filters + `locals.tenantId` + `requireTenant`, remove tenant
  layers. High risk (47+ files + DB migrations), not reversible.

## Stays either way
- Roles (school_admin/teacher/principal/parent/bursar/super_admin) — authz, not tenancy.
- Module hub + two-step nav (UX). Option A pre-enables all modules.
- `set_tenant_context` RPC removed in both (only served impersonation/pooled isolation).

## Sub-decisions (if A)
- Keep `tenants` table + `tenant_id` columns (constant-fed) — recommended.
- Remove super-admin tenant-admin UI (`/super-admin/tenants`, impersonate action).

## Proposed phases (Option A)
1. Introduce `TENANT_ID` config constant; set `locals.tenantId = TENANT_ID` in
   resolveSession (drop tenant-from-role lookup).
2. Simplify `requireTenantRole` → role-only guard (`requireRole` already exists);
   drop `requireTenant`.
3. Remove impersonation: `handleImpersonation`, cookie, `/super-admin/tenants`
   action + page, AppShell "Impersonating" badge.
4. Remove module provisioning: `getEnabledModules`, `enabledModules`,
   super-admin/modules page + action, routeGuard module gate (all-on).
5. Remove `set_tenant_context` RPC + `bindTenantContext` + its migration's use.
6. Remove `not-provisioned` route + its guard branch.
7. Verify: lint / typecheck / 187 tests / build green; manual sign-in flow.

## Verification (after each phase)
- `npm run lint` (0 errors), `npm run typecheck` (0 errors/warnings)
- `npx vitest run` (187 green)
- `npm run build` clean
