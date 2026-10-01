# eShule React — Admin Guide (School Admin, Bursar, Committee, Super Admin)

> App: `apps/web-react` (React + Vite + Tailwind 4, Sonner toasts, Recharts). ReClass = remedial module inside eShule.
> Roles and home pages (`lib/rbac.ts#roleHome`): school_admin → `/admin`, bursar/payroll → `/bursar` + `/payroll` + `/finance*`, committee (chair/secretary/treasurer/member) → `/teacher/committee*` + `/admin/committee`, principal → `/principal`, super_admin → `/super-admin`.
> Nav is a hint; `ProtectedRoute` + `PERMISSIONS.*` in `App.tsx` decide. Never render an action the server would reject.
> Out of scope (do not build or promise — `ROADMAP.md`): screening, homework, assignments, markbook, LMS/online classes, library, clubs.

---

## 1. School Admin (`/admin`, `/admin/settings`, `/admin/users`, SIS + operations)

You own setup, people, and the calendar. Money movement belongs to the bursar; approvals belong to committee. Keep those lanes clean.

### 1.1 Tenant settings (`/admin/settings` → `Ops.tsx#SchoolSettings`)

Fields today: `sms_sender_id`, `mpesa_paybill`, `kcb_account_no`. The card shows Current value + input for the new value → **Save settings**.

1. Set sender ID first (e.g. `ESHULE`) — required before any SMS send works.
2. Set paybill + KCB account exactly as the bank/Safaricom letter says. One digit wrong = unmatched payments pile up.
3. Save once, then use **Check balance** in Comms to prove SMS creds work before announcing "we are live".
4. Secrets rule: admin types secrets in, system encrypts and stores. Plaintext never shows again. Only label + test status visible afterwards.

### 1.2 Users, roles, teacher_type vs committee (`/admin/users` → `Ops.tsx#Users`)

1. Assign role: enter User ID + pick role + **Assign role**. Roles: `school_admin, principal, teacher, remedial_teacher, bursar, payroll, reclass_chair, reclass_secretary, reclass_treasurer, reclass_member, parent`.
2. `teacher_type` (on the `teachers` table: regular vs remedial) is **not** a permission. It describes staffing. Committee power comes from `reclass_committee_assignments` with effective dates (`CommitteeManagement.tsx`: `appoint_reclass_committee_member` / `end_reclass_committee_assignment`).
3. Committee seats are four offices: Chair (leadership), Secretary (records + follow-up), Treasurer (financial controls), Member (review). One person, one office at a time; end assignments (set `effective_to`), never delete — history stays for audit.
4. Role changes are audited. If someone holds two hats (teacher + treasurer), they use the sidebar role switcher; permissions switch with it.

### 1.3 Admissions → enrollment → lifecycle → exit

Route chain: `/admin/admissions` → `/admin/enrollment` → `/admin/students` + `/admin/sis` → `/admin/operations/lifecycle` → `/admin/graduation` (exit).

1. **Admissions:** record intake + decision in `Tables.Admissions`. Incomplete files stay pending — do not enroll without a decision.
2. **Enrollment:** place admitted learners into class/stream. History is preserved; re-placement writes a new record, never overwrites.
3. **Lifecycle:** dated notes in `Tables.Lifecycle` (transfers, repeats, medical flags the school is allowed to hold). Every entry needs a date + actor.
4. **Exit/graduation:** `/admin/graduation` writes the exit record. Never delete a learner with unpaid fees — deactivate instead. Deletion destroys fee evidence.

### 1.4 Imports — dry-run first (`/admin/students/import` → `Ops.tsx#StudentImport`)

Student CSV columns (exact headers):

```csv
admission_no,first_name,last_name,grade,parent_phone
ADM-001,Amina,Naliaka,Grade 5,254712345678
```

1. Prepare CSV with the header row + at least one data row. Phones in `254…` format (use `normalizePhone`: `07…` → `2547…`).
2. Dry-run: open the file in a sheet, check duplicates on `admission_no`, blank names, wrong grades. Duplicates are reported, not fatal — but clean them first.
3. Upload via the file input. Success reads "Imported N students successfully." Failure names the cause — fix the CSV, re-upload only the failed rows.
4. Large files: split into ≤500-row chunks so errors stay findable.

### 1.5 Calendar + lessons — conflicts (`/admin/calendar`, `/admin/operations/calendar`, `/admin/lessons`, `/admin/scheduling`)

1. Create lessons with teacher + class + subject + date + time + room (`Tables.Calendar`, session occurrences).
2. Clash rule: same teacher or same room at overlapping times = conflict warning. Resolve by moving time/room/teacher.
3. Overrides need a written reason and are logged (principal may override with reason; the log shows who + why).
4. Timetable pages (`Parent.Timetable`) read session occurrences — fix the occurrence, not the display page.

### 1.6 Audit view (`/admin/audit` → `Tables.Audit`)

Every sensitive action lands here: actor · time · change (role grants, committee appointments, waivers, payroll transitions, receipt voids, overrides). Use it for disputes: filter by date + actor, export the slice, attach to the incident note. If it is not in audit, it did not happen — redo it properly.

---

## 2. Bursar (`/bursar`, `/finance*`, `/admin/payments/unmatched`, `/bursar/receipts`)

You own money movement. Finance owns money; committee never touches it directly.

### 2.1 Fee types (`/admin/fees`, `/admin/payment-definitions` → `FeeManager`)

1. Create fee type: name (e.g. "Term 2 Remedial"), amount, period/due date. Save → invoices generate per assigned learner.
2. Edit a fee type only before invoicing. After invoices exist, create a new fee type rather than rewriting history.
3. Delete is always behind a two-step confirm (`ConfirmDelete`) — and only when nothing references it.

### 2.2 Bulk invoices — idempotent

1. Generate from the fee definition for the cohort/period. Safe to re-run: same fee + same learner + same period = one invoice (no doubles).
2. After generate, open the fee ledger (`Reclass.RemedialFees`): Student · Due · Paid · Status. Spot-check 5 rows (amounts, names) before telling parents to pay.
3. If a run looks wrong, do not delete invoices with payments against them — reverse via waiver/receipt-void flow below.

### 2.3 Waivers + thresholds

1. Open the invoice → Apply waiver: amount + **mandatory reason**. Audited, always.
2. Thresholds (set with school admin): waivers above the threshold need a second approver (chair or principal per your school policy). Below threshold, bursar + reason is enough.
3. Waivers reduce the balance; they never create cash. The ledger must show: invoiced − paid − waived = outstanding.

### 2.4 Reconciliation queue + unmatched_payments (`/admin/payments/unmatched`)

Table: Phone · Amount · Date · Reason. An M-Pesa payment lands here when it cannot auto-match (wrong paybill, wrong amount, unknown phone, unlinked learner).

1. Daily: open unmatched, oldest first. For each row: find the learner (phone → parent → child), match to the right obligation.
2. Match it (server links + receipt issues) or refund/advise re-send. Never leave rows older than 24 h without a note.
3. Verify daily total vs M-Pesa statement: collected in `/finance` overview (Invoiced · Paid · Outstanding) must tie to the Daraja/paybill statement ± explained unmatched.

### 2.5 Receipts — void means reversal (`/finance/receipts`, `/bursar/receipts`, `ReceiptModal`)

1. Receipts are proof of actual payment: Receipt · Amount · Date → View → print (`window.print()`, white card, KES tabular).
2. Wrong receipt? **Void = reversal entry**, never delete. The original stays with status `void`, a linked reversal row negates it, audit keeps both. Re-issue a correct receipt separately.
3. Print CSS must isolate the receipt on paper. Check dark-mode screens still print ink-on-white.

### 2.6 Aging + CSV (`/finance/reports` → `FinanceReports`, `reports-csv` function)

Report buttons: `revenue`, `students`, `subjects`, `teacher-attendance`, `teachers`. Each downloads `<report>.csv`.

1. **Aging:** bucket outstanding by due date: Current (0–30 d), 31–60 d, 61–90 d, 90 d+. Chase oldest first; send fee_due SMS per bucket.
2. CSV column lists (what to expect):
   - `revenue`: `receipt_no, student, admission_no, amount, date, method, status`
   - `students`: `admission_no, first_name, last_name, grade, class, status, parent_phone`
   - `subjects`: `code, name, teacher, periods_per_week`
   - `teacher-attendance`: `teacher, employee_no, date, status, approved_by, approved_at`
   - `teachers`: `employee_no, first_name, last_name, teacher_type, phone, status`
3. Open CSVs in a sheet before sending to the principal — check totals tie to the dashboard KPIs.

---

## 3. Committee — Chair, Secretary, Treasurer, Member

Surfaces: `/admin/committee` + `/teacher/committee` (`CommitteeManagement.tsx`), `/admin/attendance` (`Reclass.Attendance`), `/teacher/committee/payroll` + `/admin/payroll` (`RemedialPayroll` → `PayrollPanel`), `/admin/reclass*`.

### 3.1 Who does what

| Office | Owns | Cannot do |
|---|---|---|
| Chair | Meeting decisions, final attendance sign-off, SLA enforcement (48 h) | Touch money, edit payroll amounts |
| Secretary | Records, appointment dates, follow-up notes, rejection reasons quality | Approve own attendance, authorize payouts |
| Treasurer | ReClass financial controls, payroll review, parent-payment follow-up | Generate + authorize the same run (see SoD) |
| Member | Review attendance, second pair of eyes | Act alone on payroll |

### 3.2 Approve attendance (the weekly job)

1. Open Attendance review / register: Teacher · Status · Date (+ paginator Page n · total, 50/page).
2. Approve what you verified; **reject with a written reason** (e.g. "Absent — no cover arranged, verified with deputy"). Reason is mandatory.
3. SLA: decide every row within **48 hours** of marking. Stale rows block payroll evidence.
4. `already_approved` rows are locked — corrections need a new audited entry, not an edit.

### 3.3 Payroll — run vs authorize (separation of duties)

`PayrollPanel` ops via `payroll-ops` edge: `generate` → `approve` → `mark-paid`. Status strip: Runs · Paid · Pending.

| Step | Who | Notes |
|---|---|---|
| Generate (run) | Treasurer or payroll officer | Period start/end dates required; creates draft run from approved attendance |
| Approve (authorize) | A **different** person (chair or secretary, never the generator) | Reason required; checks attendance evidence + amounts |
| Mark paid | Bursar/treasurer after bank/M-Pesa payout | Attaches payout proof; only then status = `paid` |

SoD rule: **the person who generated a run cannot approve it.** The server enforces this; the UI shows both buttons but the second call fails if you try to self-approve. Plan leave cover so two authorized people always exist.

---

## 4. Super Admin (`/super-admin`, `/super-admin/audit`, `/super-admin/settings`)

Tenants + Modules tables only. Tenant-scoped learner/fee data **never renders here** — if you can see it, that is a bug, report it.

### 4.1 Impersonation — time-boxed + reason + audit

1. Impersonate only for support/debugging, with a ticket number as the reason.
2. Time-box: shortest window that solves it (e.g. 30 min). Expiry is automatic; re-request if needed.
3. Everything done while impersonating is stamped as you-as-them in audit. Tell the school what you touched when you finish.

### 4.2 Suspend, don't delete

Tenant offboarding = **suspend** (blocks logins, keeps data for retention/legal + possible reactivation). Delete only under an explicit data-deletion workflow with backup + sign-off. Same for learners with fees: deactivate, never delete.

### 4.3 Platform billing creds are never tenant fallback

- `platform_billing` creds = Mobiwave's **own** account, used only for platform billing/operations.
- Each school brings its **own** `school_send` creds (Mobiwave API token) + own Daraja paybill. If a school has none, it **cannot send/collect** until configured (or the owner explicitly provisions managed `school_send` creds for that tenant on a managed plan).
- Before activating a school: test Mobiwave `/balance` + Daraja token/STK. Live sends require a passed test. Prefer each school's own paybill for clean reconciliation.

---

## 5. Separation-of-duties (SoD) table — pin this

| Action | School Admin | Bursar / Payroll | Committee | Principal | Super Admin |
|---|---|---|---|---|---|
| Tenant settings, users/roles, calendar, imports | ✅ own | — | — | view | tenants/modules only |
| Fee types, invoices, waivers (reason), unmatched matching, receipts + void-as-reversal | — | ✅ own | — | view/reports | — |
| Attendance review, approve/reject + reason | — | — | ✅ own | SLA oversight | — |
| Payroll generate | — | ✅ (treasurer/payroll) | — | — | — |
| Payroll approve/authorize | — | ❌ if generator | ✅ (different person) | — | — |
| Mark paid + payout proof | — | ✅ | — | — | — |
| Impersonate / suspend tenant / platform billing | — | — | — | — | ✅ (time-boxed, audited) |

Rule: no one approves their own work; finance never approves attendance; committee never moves money; principal oversees without operating buttons.

---

## 6. Error vocabulary — what staff tell parents (map 1:1 with user guide)

| System / screen words | Plain meaning for the parent | Staff action |
|---|---|---|
| "STK push sent. Complete the prompt…" | Request sent, waiting on phone + Safaricom | Tell parent to check phone/PIN; check `/parent/payments` status |
| `pending` / "Queued for delivery" | Waiting — do not retry yet | Wait; check unmatched queue after ~15 min |
| `completed` / "Paid · KES 2,500 · Receipt RC-001" | Money confirmed | Give receipt number; done |
| `DUPLICATE_REQUEST` | Request already running (double tap) | Stop parent retrying; wait 2–5 min |
| Amount/phone mismatch errors | Input above balance or bad phone | Verify obligation + number; fix before retry |
| "Already approved — no further action" | Locked attendance, informational | Correct only via audited committee entry |
| "Unable to load …" | Data/network error | Reload once; escalate to admin/super admin |
| "Not allowed / no permission" | Server denied | Check role + permission matrix; never share logins |
| Unmatched row (Phone · Amount · Date · Reason) | Cash arrived, no home yet | Match within 24 h or advise re-send/refund |

SMS templates (`lib/sms.ts`): `fee_due`, `receipt_issued`, `payroll_paid`, `attendance_flag`, `announcement`, `manual_custom` (only custom is editable; rest are read-only previews). Recipients comma-separated in `254…`. STOP is per-category + per-phone; receipts/security messages always send.

---

## 7. CSV column lists (copy-paste ready)

```csv
# students (import)
admission_no,first_name,last_name,grade,parent_phone

# revenue report (export)
receipt_no,student,admission_no,amount,date,method,status

# teacher-attendance report (export)
teacher,employee_no,date,status,approved_by,approved_at
```

Phones: normalize to `254…` on entry. Amounts: KES with `en-KE` grouping, tabular numerals in tables.

---

## 8. Go-live checklist (sign each line)

- [ ] Tenant settings saved: sender ID, paybill, KCB account — verified digit by digit.
- [ ] SMS balance check passes; test message received on a real handset.
- [ ] Daraja STK test passes (token + sandbox prompt + callback reconciles).
- [ ] Users + roles assigned; committee four offices filled with effective dates; leavers ended, not deleted.
- [ ] Student import dry-run clean; duplicate `admission_no` count = 0; parent phones normalized.
- [ ] Calendar term created; sample lesson clash tested (warning fires; override needs reason).
- [ ] Fee type + idempotent bulk invoice tested on a pilot class; ledger spot-check 5 rows.
- [ ] Waiver threshold agreed + second approver named; test waiver carries a reason.
- [ ] Unmatched queue empty at cutover; daily match rota named (who checks before 9 a.m.?).
- [ ] Receipt print tested on paper (white card, ink, KES tabular); void-as-reversal rehearsed.
- [ ] Payroll SoD rehearsed: generator ≠ approver; `mark-paid` attaches proof.
- [ ] Approval SLA 48 h communicated to committee; principal knows where the queue lives.
- [ ] Audit view opened and understood; backup/restore + rollback drill done (see `docs/dr-runbook.md`).
- [ ] STOP wording published to parents (per-category, per-phone; receipts always send).
- [ ] Scope reminder shared: no screening, homework, markbook, LMS, library, or clubs promised.

*Kazi safi: one owner per shilling, one reason per rejection, one receipt per payment.*
