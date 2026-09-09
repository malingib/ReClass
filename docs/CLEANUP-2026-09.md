# September 2026 Code & Documentation Cleanup

**Date:** 2026-09-09  
**Product:** eShule  
**Module:** ReClass is the remedial programme-management module within eShule.

## Purpose

This cleanup pass consolidates current product terminology, removes ambiguity between historical and current documentation, and makes the active delivery boundary explicit without introducing new product scope.

## Documentation decisions

- **eShule** is the platform/product name.
- **ReClass** refers to remedial learning and programme operations within eShule.
- The canonical student model is `students` plus admissions, enrollments, lifecycle/history and related records; an enrollment is a time-bounded school relationship and must not overwrite prior enrollment history.
- Current student operations are:
  - Admissions
  - Enrollment
  - Student Lifecycle
  - Retention & History
  - Graduation & Exit
  - ReClass
  - School Calendar
  - Lessons
  - Teacher Tasks/Reminders
- Admissions does not include screening.
- No new discipline, homework, assignments, markbook, LMS/online-class, learning-resource/library, clubs or activities scope is part of this phase.
- Historical material under `docs/` remains available for traceability but is not authoritative when it conflicts with current root documentation or verified implementation.

## Engineering conventions

- Prefer the existing shared server/domain modules for privileged operations rather than duplicating authorization logic in routes.
- Derive tenant context from the verified server session.
- Scope privileged queries, mutations and referenced records explicitly to the tenant.
- Treat RLS as defense-in-depth; service-role access must not rely on RLS for primary isolation.
- Preserve separation of duties across Bursar, Payroll, ReClass committee and Principal responsibilities.
- Keep invoices/obligations, payments, receipts and payroll records as distinct concepts.
- Update tests and documentation when a business invariant changes.
- Keep database migrations forward-ordered, replayable and safe to apply to a clean environment.

## Release verification baseline

The latest repository CI baseline is green for the application checks and local database validation. This includes lint, static tenant-isolation checks, type checking, tests, production build, local Supabase startup, migration replay and database cross-tenant isolation.

The E2E workflow is configured, but browser execution requires an appropriate non-production environment. Hosted Supabase configuration, provider credentials/callbacks, backup/restore and production deployment remain environment-specific release verification items.

## Historical audit handling

`FINAL_REPORT.md` and dated audit documents are retained as evidence of earlier review states. They should not be interpreted as a description of today's implementation where later migrations, code changes or root documentation supersede them.

## Cleanup outcome

This document is intentionally a lightweight change record. It does not replace `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `API.md` or `ROADMAP.md`; those remain the authoritative references for their respective subjects.
