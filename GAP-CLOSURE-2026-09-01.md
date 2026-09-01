# ReClass / eShule — Gap Closure & Ownership Contract

Date: 2026-09-01

## Ownership model

| Area | Owner | What the owner may do | What remains outside the area |
|---|---|---|---|
| SIS | School administration | Student, parent, teacher, class and subject administration | Remedial delivery operations |
| ReClass / Remedial | ReClass operational team | Scheduling, remedial sessions, delivery attendance, remedial fees and remedial payment operations | School-finance ledger |
| School Finance | Bursar | School fee collection/reconciliation, school-domain financial visibility and receipt evidence | Remedial M-Pesa operations |
| Payroll | Payroll function | Teacher compensation derived from approved attendance; remedial committee treasurer prepares and chairman approves/authorizes according to the existing workflow | Fee definitions and general SIS administration |
| Receipts | Shared evidence layer | Document actual paid transactions and provide printable/exportable evidence | Creating fictional or unverified payment records |
| Notifications | Shared service | Deliver user-scoped alerts, receipts and operational notices | Authorization decisions |
| Audit | Shared service | Record material financial, governance and security events | Acting as a business owner |

## Rights-driven UX rules

1. The server remains the source of truth. UI visibility is convenience, never authorization.
2. Teacher `teacher_type` determines the teaching surface: `classroom`, `remedial`, or `both`.
3. A teacher's `remedial_role` is a governance hat, not a replacement for teacher type.
4. Chairman/member can review remedial attendance; treasurer prepares remedial payroll and initiates the existing payout workflow; chairman approves payroll.
5. Bursar is a school-finance persona. The Bursar workspace must not present remedial M-Pesa as an owned workflow.
6. Receipts are evidence of actual payments. Receipt pages should expose payment facts and printing/export, not fee-definition ownership.
7. Principal is oversight: remedial visibility, attendance review, SIS visibility and financial visibility where the existing reporting surface requires it; principal is not the Bursar or remedial operator.
8. School administration retains cross-domain operational control for the single-tenant deployment.

## September gap-closure changes

- Formalized fine-grained role capabilities so Bursar no longer inherits remedial capabilities merely because it is a privileged role.
- Redesigned Bursar workspace around the `school` payment domain only.
- Redesigned teacher dashboard around explicit teaching scope and committee responsibility.
- Made teacher type editable from the SIS teacher administration screen so access scope is actually configurable.
- Clarified portal subtitles and ownership language.

## Remaining release gates

- Run the repository's authoritative `npm run typecheck`, tests and build on this branch.
- Review the teacher navigation so the Committee link is hidden for teachers with `remedial_role = none` while remaining discoverable for committee officers.
- Verify all finance write actions are owner-gated server-side and all receipt views remain read/evidence oriented.
- Keep the existing tenant-isolation scanner as a hard CI gate.
- Do not promote the current service-role/RLS architecture to a second tenant without the planned database/RLS rebuild.
