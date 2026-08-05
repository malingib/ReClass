# eShule — Payment Platform v2 (2026-08-02)

## Decisions (user-confirmed)

1. **Both channels in both domains.** Parents may pay for one or more students,
   for school fees AND/OR remedials. A tenant configures keys per platform (KCB
   bank + M-Pesa paybill). **Constraint: one payment type per domain per tenant —
   either bank or paybill** (`tenants.school_payment_channel`,
   `tenants.remedial_payment_channel` ∈ {bank, mpesa}; defaults school=bank,
   remedial=mpesa).
2. **Admission-no routing (BillRefNumber).** M-Pesa callback resolves the student
   by the account reference = `students.admission_no`; works for both app-initiated
   STK and manual paybill deposits (no checkout row required).
3. **Admission numbers kept ≤ 12 chars** (Safaricom AccountReference limit).
4. **ReClass student ledger** — import active SIS students into
   `remedial_enrollments`; list shows per student: paid + balance per domain.
5. **Unmatched payments queue** — payments with unresolved `student_id` (bad adm
   no) get a manual-match UI (admin/bursar).
6. **`reconcile_payment` extended** — accepts `p_student_id`, `p_fee_type_id`,
   `p_domain` so the callback stamps the student in one shot.
7. **Manual edits with audit trail** — payment edits write `audit_log`
   (before/after JSONB).
8. **Transactions per student, per domain** — same as domain receipts, but
   grouped by student.

## Schema changes
- `tenants` + `school_payment_channel`, `remedial_payment_channel`
- `students.admission_no` CHECK `char_length <= 12` (NOT VALID — safe on live)
- `reconcile_payment(p_checkout_id, p_amount, p_phone, p_tenant_id, p_student_id,
  p_fee_type_id, p_domain)` — stamps student/domain on insert
- **No `remedial_enrollments`** — ALL students attend remedials, so the ReClass
  student ledger derives directly from `students` + `payments` (no import step).

## Edge functions
- `stk`: AccountReference = admission_no (not FEE-…); resolves tenant channel for
  the fee's domain; refuses STK if that domain is bank (client shows bank details).
- `mpesa-callback`: parse `BillRefNumber`; when no checkout row, resolve student
  by admission_no; call v3 RPC. Unresolvable adm no → payment with NULL student
  (lands in unmatched queue).

## UI
- Settings: per-domain channel select + conditional keys (bank: KCB acc/no/buni;
  mpesa: shortcode/paybill + credentials)
- ReClass: student ledger page (ALL students, no import — paid + balance per
  student, drill into student transactions)
- Admin/bursar: unmatched-payments queue with manual match (audit-logged)
- Parent: pay flow covers both domains; channel-aware (STK push vs bank details);
  multi-student
- Receipts/transactions stay per domain, now also per student

## Files
- Migration `20260802000003_payment_channels_enrollments.sql`
- `src/lib/server/_finance/payments.ts` (ledger, unmatched, manual edit w/ audit)
- `src/lib/server/_platform/payment-channels.ts` (tenant channel resolution)
- Routes: settings (channel UI), `/admin/reclass/students`, `/admin/payments/unmatched`,
  parent/pay (both domains + channel)
- Edge: `stk/index.ts`, `mpesa-callback/index.ts`
