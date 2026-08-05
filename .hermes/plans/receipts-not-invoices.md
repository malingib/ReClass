# Plan: Drop invoices — payments ARE receipts

## Goal
Per user decisions (clarify 2026-07-31): **remove the invoice lifecycle entirely**,
including **teacher invoices**. Each `payment` becomes a self-contained **receipt
record** (student, fee_type, amount, method, reference, timestamp, cashier). No balances,
outstanding, aging, reminders, or waivers. A receipt prints from the payment row.

## Data decision (historical rows)
**Keep the `invoices` and `teacher_invoices` tables, make their FKs nullable, and STOP all
app writes/reads to them.** Rationale: live tenant DB already has invoice rows; a hard
DROP + data migration is high-risk/irreversible on production, and the new receipts model
has different semantics (no balances). Deprecated read-only tables preserve audit history
with zero data-loss. Conservative + reversible.

## Current model (to collapse)
`fee_types` → `invoices(id, student_id, fee_type_id, amount_due, amount_paid, status,
due_date)` → `payments(invoice_id NOT NULL, ...)` → `waivers(invoice_id NOT NULL)` →
`teacher_invoices(...)` → reconciliation / grant_waiver RPCs.

## Target model
- **`payments` = the receipt.** Add: `student_id`, `fee_type_id`, `domain`, `receipt_no`,
  `cashier_id`. Make `invoice_id` NULLABLE (kept for history).
- `invoices`, `teacher_invoices`, `waivers`, `checkout_requests.invoice_id`: kept, FKs
  nullable, no new writes.
- `fee_types`: retained (fee *menu*, not an invoice).
- Reconciliation RPC: just stamps `payments.reconciled_at` (idempotent). Drops invoice
  update + overpayment logic.
- `grant_waiver` RPC: removed.

## Payment flow changes
1. M-Pesa STK (parent pay): pick a `fee_type` → payment recorded directly
   (student_id, fee_type_id, domain). `checkout_requests.invoice_id` → nullable.
2. KCB bank (`recordBankPayment`): validate `fee_type_id` is school domain; insert payment
   with student_id + fee_type_id + domain='school'. No invoice update.
3. Teacher payroll: `payroll_runs` (per-session, rate × attendance) already exists and is
   the real payroll engine. `teacher_invoices` generation UI/actions removed; payroll_runs
   retained as the teacher-payment record.

## Receipts (printable)
- New `admin/(finance)/receipts/[id]/print` (+server.ts): HTML receipt
  (school, receipt_no, student, fee_type, amount, method, reference, date, cashier).
- Parent portal: payment history lists payments; each has "Print receipt".

## KPIs / dashboards
- Drop "Outstanding / unpaid / aging / reminders". Replace with collections metrics:
  school collected, M-Pesa collected, payments today, recent payments feed.
- Bursar aging report → payments/collections list + CSV of payments.

## Files to change (~24)
Server/lib:
- `_finance/invoices.ts` — DELETE
- `_finance/bank-payments.ts` — fee_type-based
- `_finance/waivers.ts` — DELETE (keep nothing used)
- `_finance/teacher-invoices.ts` — DELETE
- `_dashboard/admin-dashboard.ts`, `_remedial/dashboard.ts` — drop balance KPIs
Routes:
- `admin/(finance)/finance/+page.*` — KCB form → fee_type select; cards → collections
- `admin/(finance)/reports/+page.*` — aging → payments list
- `admin/(finance)/reports/revenue-csv/+server.ts` — export payments
- `admin/(finance)/teacher-invoices/**` — DELETE route
- `admin/(remedial)/parent-payments/+page.*` — list payments (receipts)
- `bursar/+page.*`, `bursar/csv/+server.ts` — aging → collections
- `parent/+page.server.ts`, `parent/payments/+page.server.ts`, `parent/pay/+page.*`
  — STK → fee_type; history = payments
- `admin/(finance)/fees`, `admin/(remedial)/remedial-fees` — fee_types CRUD retained,
  relabel away from "invoice"
- NEW `admin/(finance)/receipts/[id]/print/+server.ts`
Migrations:
- NEW `20260731000001_drop_invoice_lifecycle.sql` (additive, reversible):
  - payments: invoice_id nullable; add student_id, fee_type_id, domain, receipt_no,
    cashier_id
  - checkout_requests.invoice_id nullable
  - waivers.invoice_id nullable
  - reconcile_payment rewrite (stamp reconciled_at only)
  - drop grant_waiver (+ dependents)
  - indexes for student_id, fee_type_id, receipt_no
Tests:
- `tenant-isolation.test.ts` — remove invoice assertions; add payment-receipt assertions
- Add e2e: record KCB payment via fee_type, print receipt, verify no invoice created.

## Verification
typecheck, lint, unit test, build; apply migration to LIVE DB; Playwright smoke.
