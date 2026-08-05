# Section Quality Loop

This is the repeatable review loop for every user-facing section of eShule. A
section is a role surface or shared surface, not just a single file. The loop
must leave evidence in the pull request or audit note before the section is
considered complete.

## 1. Inventory

Run `npm run audit:sections` to enumerate the current SvelteKit page routes,
role section, domain, and whether a server loader exists. Treat the generated
route list as the source of truth; do not maintain a second hand-written list.

Group the inventory into these review areas:

- shared: login, account, notifications, errors, and app shell
- admin/platform: settings, users, credentials, modules, and notifications
- admin/SIS: students, parents, teachers, subjects, classes, and admissions
- admin/finance: fees, income, expenses, payroll, receipts, reports, and exports
- admin/ReClass: scheduling, attendance, remedial fees, payments, payroll, and reclass
- role portals: teacher, parent, principal, bursar, and super-admin

## 2. Analyze

For each route, write down the intended user, primary job, inputs, outputs,
permissions, data dependencies, empty/loading/error states, and the most risky
business rule. Check the page, its server loader/actions, shared components, and
the relevant Supabase migration together.

## 3. Audit

Use the following checklist for every route:

- Authentication and role/module authorization are enforced server-side.
- Every tenant query is tenant-scoped and every mutation validates ownership.
- Money, attendance, grades, credentials, and personal data have explicit validation.
- Loading, empty, success, failure, duplicate-submit, and destructive-action states exist.
- Navigation reaches the route and the route does not expose an unintended domain.
- Keyboard access, labels, focus behavior, contrast, and responsive layout are usable.
- Logs and errors avoid secrets and unnecessary personal data.
- Pagination/export behavior is bounded and consistent with the domain rules.

Record findings as `P0` (release blocker), `P1` (high-risk defect), `P2`
(important quality gap), or `P3` (polish). Each finding needs a file/route,
evidence, impact, and an acceptance test.

## 4. Review

Before changing code, review findings against the domain owner and existing
tests. Combine duplicates, reject speculative findings without evidence, and
sequence work by risk: tenant isolation/authentication, financial integrity,
data loss, core workflows, accessibility, then polish.

The review output for a section is a small table:

| Finding | Severity | Evidence | Acceptance test | Status |
| --- | --- | --- | --- | --- |
| Example | P1 | route + file/line | reproducible test name | open |

## 5. Implement

Fix one coherent finding at a time. Prefer shared fixes for repeated behavior
(authorization, validation, delete confirmation, loading states, tables), then
add section-specific behavior. Keep the diff narrow and update the relevant
test at the same time. Do not mark a finding resolved until its acceptance test
exists and passes.

## 6. Test

Run the smallest relevant test first, then the full gates:

```text
npm run audit:sections
npm run lint
npm run check
npm test
npm run build
npm run test:e2e       # when staging credentials/secrets are available
```

For each section, the minimum evidence is one route/navigation smoke, one
permission or tenant-boundary check, one happy-path workflow, and one failure
or destructive-path check. Financial and identity sections additionally need
idempotency/replay and cross-tenant negative tests.

## Exit criteria

A section is `pass` only when its findings are closed or explicitly accepted,
the relevant tests pass, no new type errors or lint errors are introduced, and
the route inventory still matches the reviewed surface. A release is `go` only
when all P0/P1 findings are closed, the full local gates pass, and any skipped
E2E/security/integration gate has an owner and follow-up date.

## Review record template

```markdown
## Section: <name>
Date: YYYY-MM-DD
Routes: <output from npm run audit:sections>
Reviewer: <name>

### Analyze
- User/job:
- Critical rules:
- Dependencies:

### Findings
| Finding | Severity | Evidence | Acceptance test | Status |
| --- | --- | --- | --- | --- |

### Implemented
- <change> — <file/route>

### Test evidence
- `npm run ...` — pass/fail
- E2E/security/integration: pass/skipped (owner + follow-up)

### Decision
Status: pass / conditional / blocked
```
