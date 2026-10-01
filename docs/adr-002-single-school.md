# ADR-002 — Single-school deployment, multi-tenancy deferred

**Date:** 2026-09-29
**Status:** Accepted
**Context:** ADR-001 (frontend and deployment). Live Supabase project `eShule`
(`rlswdeswlkuaigwtojxw`, `eu-west-1`).

## Decision

eShule deploys **one school per Supabase project**. Multi-tenancy is **deferred,
not abandoned**. Each school gets its own project (own Postgres, Auth, Edge
Functions, secrets); no `tenant_id` scoping, no `tenants` table, no RLS
tenant predicates.

## Evidence (verified 2026-09-29 against live project)

- Live DB: 62 public tables, **0 `tenant_id` columns**, no `tenants` table,
  `school_settings` singleton present. Project `ACTIVE_HEALTHY`, Postgres 17.
- All 8 RPCs the React frontend calls exist live (`get_parent_reclass_payments`,
  `review_teacher_attendance`, `mark_own_teacher_attendance`,
  `initiate_parent_reclass_payment`, …).
- 10 Edge Functions `ACTIVE` live. **Not yet deployed:** `reclass-stk`,
  `reclass-mpesa-callback` — the parent Pay Now path the frontend invokes.
  Legacy `stk` / `mpesa-callback` are deployed but no longer called.

## Consequences

1. **Simpler security model.** No cross-tenant leakage class; RLS still guards
   per-role row access. Application convention risk from the old model is gone.
2. **Per-school operations cost.** Provisioning, migrations, secrets, backups and
   Edge Function deploys repeat per school. Automation for fleet management is
   future work, not current scope.
3. **Migration history must be rebuilt.** Live has 163 applied migrations; the
   repo holds 137 files with 4 duplicate version numbers and ~34 files never
   applied live. Fresh-project replay is currently impossible. The fix is a
   squashed baseline migration regenerated from the live schema, then
   expand-and-contract discipline afterwards.
4. **CI tenant gates are obsolete.** `scripts/verify_tenant_isolation.py` and
   `supabase/tests/tenant_isolation.sql` test a removed model. Follow-up: retire
   or repurpose them as single-school integrity checks (unscoped-query audit).
5. **Commercial posture.** One deployment = one school. Pricing, onboarding and
   support assume per-project provisioning until multi-tenancy returns.

## When to revisit

Second paying school, or any shared-hosting requirement. Revisit with a fresh
ADR covering `tenant_id` reintroduction, RLS predicates, per-tenant credentials
and a migration plan from single-school projects.
