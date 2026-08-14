# User Journey — Bug Fixes, Improvements & Cleanup Plan

Audit of the eShule/ReClass user journey (role → module two-step nav). Every item below is
verified against source at the cited location. Single-tenant context assumed (per user: "we are
only setting up one tenant here").

## Phase 1 — Bugs (correctness) ✅ DONE
- [x] **B1: `/account` shows role as tenant.** Removed the bogus `tenant` field
  (`src/routes/(app)/account/+page.svelte:8`). Single-tenant ⇒ field dropped (folds into D3).
- [x] **B2: nav fallback to `school_admin` for unknown role.** `AppShell.svelte:174` —
  `roleNav[role] ?? null`; missing config now sets `navMisconfigured` and renders an amber
  "Navigation for the '<role>' role is not configured" notice instead of impersonating admin links.
- [x] **B3: disabled module → friendly page.** `middleware.ts:211` now throws
  `error(403, { code: 'module_not_enabled', message })`. Added `App.Error` interface (`app.d.ts`)
  carrying `code`, and `+error.svelte` renders the module message for that code.

### Verification (Phase 1)
- lint: 0 errors · typecheck: 0 errors/0 warnings · tests: 184/184 · build: clean

## Phase 2 — Improvements (UX/clarity) ✅ DONE
- [x] **I1: disambiguate payrolls.** `AppShell.svelte` nav now reads
  "Remedial teacher payroll" (`/admin/payroll`) vs "School payroll" (`/admin/finance/payroll`).
  (`reclass`→`remedial` rename was already applied to live — see D2, so no further rename needed.)
- [x] **I2: module breadcrumb.** `AppShell.svelte` header now shows
  `All modules › <Module name>` on non-hub pages (sidebar is hidden on the hub), driven by the
  existing `routeFor($page.url.pathname)` / `currentModule` derivation.
- [x] **I4: real password flow.** `src/routes/(app)/account/+page.svelte` replaced the dead-end
  `supabase.com/dashboard` link with an in-app "Update password" form using the browser client's
  `auth.updateUser` (≥8-char validation, inline success/error). Self-service for parents/teachers.
- [ ] **I3 (low priority, deferred):** branding debt (`x-reclass-user` cookie, migration filenames).
  Cosmetic; left to avoid churn since it's single-tenant and low-risk.

## Phase 3 — Discard (aggressive cleanup) ✅ DONE
- [x] **D1: prune genuinely dead registry exports.** Verified via grep that `ROLE_SURFACE`,
  `MODULES`, `MODULE_LIST`, `KERNEL_MODULES`, `canImport`, `isKernel`, `suiteModules`, `moduleIcons`
  all have internal callers inside `modules.js` (routeFor/gatedModuleForPath/isKernel). Only the two
  truly unused exports were removed: `KERNEL_ROUTES` and `PUBLIC_SURFACE` (the latter also referenced
  in a misleading "import-boundary enforcement" comment that was wrong — `canImport` never reads it).
  Removed from `modules.js`, `modules.d.ts`, `packages/shared/src/lib/index.ts`, and `src/lib/modules.ts`.
- [x] **D2: drop the `reclass` bridge.** Confirmed live: rename migration `20260807000001` IS applied
  and `tenant_modules` has zero `reclass` rows (only `finance`, `remedial`, `reports`, `sis`). Deleted
  `normalizeModuleId` (`modules.ts`), its 2 call sites, and the legacy mirror block in
  `super-admin/modules/+page.server.ts`. Updated `modules.test.ts` which asserted the old behavior.
- [x] **D3: remove `tenant` field from `/account`** (done in B1).

### Verification (Phases 2-3)
- lint: 0 errors · typecheck: 0 errors/0 warnings · tests: 184/184 · build: clean
- No dangling references to removed symbols (`KERNEL_ROUTES`/`PUBLIC_SURFACE`/`normalizeModuleId`) remain.


## Verification (after each phase)
- `npm run lint` (0 errors), `npm run typecheck` (0 errors/warnings)
- `npx vitest run` — full suite green (currently 184/184)
- `npm run build` clean
- Manual: sign in as school_admin → `/admin` redirects to `/admin/modules` → open a module →
  breadcrumb present; toggle a module off in super-admin → friendly "not enabled" page (B3);
  `/account` shows correct fields only.

## Out of scope (confirmed correct, do NOT touch)
- Role isolation / routeGuard (sound)
- Tenant Proxy `.rpc()` fix (already applied)
- `invalidateModuleCache` on toggle (works)
