# Changelog

All notable implementation and repository changes are documented here. This is the implementation ledger; dated audits and planning documents are supporting evidence, not release history.

## [Unreleased] — 2026-09-01

### Changed

- Reframed the product as **eShule**, with **ReClass** explicitly documented as the remedial learning and programme-management module.
- Consolidated the 2026-09-01 implementation and UX work on `main`, preserving the repaired complete repository tree.
- Aligned About and README content with the current product, architecture, responsibilities and rights model.
- Updated architecture documentation to describe the current modular-monolith/SvelteKit/Supabase implementation rather than historical design assumptions.
- Established the responsibility model: Bursar owns school finance; ReClass owns remedial operations; Payroll owns teacher compensation; Receipts document actual payments; notifications and audit are shared services.
- Documented capability-driven UX: base role → assignment → responsibility → right/capability → derived navigation/dashboard/actions, with server-side authorization remaining authoritative.
- Documented teacher delivery scope (`classroom`, `remedial`, `both`) separately from remedial governance assignments.
- Consolidated remedial committee separation of duties for attendance review, payroll preparation, payout initiation and approval.
- Added/retained production-oriented UX work covering teacher, parent, principal, bursar, payroll, receipts, committee administration, communications, notifications, analytics, audit and accessibility.
- Added financial integrity work covering payroll domain separation, payment reconciliation/idempotency and tenant-aware financial relationships.
- Added documentation and verification tooling for the current UI and authorization model.

### Documentation cleanup

- Root documentation is now the authoritative documentation surface.
- `docs/README.md` is an index to canonical root documents and supporting material.
- Legacy duplicate lower-case API/architecture documents are reduced to compatibility pointers so stale contracts cannot be mistaken for current implementation.
- Historical audits remain dated and are not presented as current product documentation.

### Security and correctness notes

- Service-role access bypasses RLS; privileged operations therefore require explicit tenant and ownership scoping.
- UI visibility is never treated as authorization.
- Financial operations remain separated between obligations, actual payments/receipts and payroll compensation.
- Production readiness is not implied by repository presence; migration replay, live authorization, provider, recovery and deployment evidence remain release gates.

## Historical implementation ledger

Earlier implementation entries follow below. They remain useful for tracing repository evolution, but current behavior is determined by the code and current root documentation.

