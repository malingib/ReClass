# eShule — Constitution

Governing principles for the eShule platform (formerly ReClass), a multi-tenant school
management platform built with SvelteKit 5 + Supabase.

## Product principles

1. **eShule is the platform; modules are the product surfaces.** The platform name is
   eShule. Modules (ReClass remedial, SIS, Finance, Payroll, Communications, Reports,
   Platform) are independent, extensible workspaces provisioned per-tenant by the
   super admin. No module name equals the platform name.
2. **Domain independence.** Each module owns its data tables, its dashboard, its
   payroll, and its receipts. Cross-domain data is shared by reference (students are
   SIS-owned), never duplicated. A module dashboard shows ONLY its own domain data.
3. **Two financial systems stay separate at the data layer.** School fees (Finance,
   KCB/bank) and Remedial fees (ReClass, M-Pesa) are distinct domains: separate
   payroll, separate receipts, separate collections. Never conflate.
4. **Payments are receipts.** There is no invoice lifecycle. Each `payments` row is a
   self-contained receipt. Per-domain receipts lists filter by `domain` + channel.
5. **Module registry is the single source of truth for nav.** The sidebar, module
   picker, and route→module mapping are derived from one registry, and filtered by
   what the super admin has provisioned for the tenant.

## Engineering principles

6. **Specs before code.** Major work starts in `.spec/` (constitution → spec → plan →
   tasks). Implementation follows the plan; `converge` reconciles drift.
7. **Types are the contract.** `database.types.ts` mirrors live migrations. `npm run
   check` (svelte-check) and `npm run build` must both pass; unit tests must stay green
   (tenant-isolation gate included).
8. **Tenant isolation is non-negotiable.** Every tenant-scoped query uses `locals.srv`
   + `.eq('tenant_id', ...)`. New tables get RLS + tenant policy + updated_at trigger.
9. **No dead code.** Deleting a feature deletes its routes, types, tests, nav entries
   and migrations history stays but a drop migration reverses live objects.
10. **Migrate forward, never edit applied migrations.** Schema changes are new
    timestamped files; `db push` applies them via HTTPS.
