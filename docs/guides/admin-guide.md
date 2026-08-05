# ReClass — Admin Guide (School Admin, Principal, Bursar, Super Admin)

## School Admin (Malingi)
- **Onboard:** Settings → tenant name/logo/colors, M-Pesa shortcode + paybill, SMS sender ID, academic year/term, currency (KES).
- **Students:** CRUD or *Bulk import* (CSV: admission_no, first_name, last_name, grade, parent_phone). Duplicates reported, not fatal.
- **Teachers:** add, link login, assign subjects. **Subjects & Groups:** create subject, create remedial group (subject + teacher + room + capacity + term).
- **Users & Roles:** assign role per user (teacher/parent/bursar/principal). Role changes are audited.
- **Fees:** create fee type (e.g. "Term 1 Remedial", amount, due date) → invoices auto-generate per assigned student.

## Credentials (per-tenant — critical)
- **Integrations** page: set & save your school's own **Daraja** (consumer key/secret, passkey, shortcode) and **Mobiwave SMS** (API token) credentials. Admin enters secrets → system encrypts and stores; plaintext never shows again (only label + test status).
- Always **Test** before activating (verifies Mobiwave `/balance` + Daraja token/STK). Live sends require a passed test.
- **super_admin (Mobiwave owner)** sets `platform_billing` credentials = Mobiwave's OWN account, used only for platform billing/operations — never as a fallback for a school's sends. If a school hasn't set its own `school_send` creds, it simply cannot send/collect until configured (or is placed on an explicit platform-managed plan where the owner provisions `school_send` creds for that tenant). Prefer each school to bring its own paybill for clean reconciliation.

## Principal
- **Approve attendance:** *Attendance → Approve* locks sessions (becomes trustworthy). Review effectiveness dashboard (attendance vs participation).
- **Override scheduling conflicts:** when a room/teacher clash warning appears, admin can override with a reason (logged).

## Bursar
- **Reconcile:** *Revenue* dashboard shows paid/owing; M-Pesa auto-reconciles via callback. Verify daily total vs M-Pesa statement.
- **Waivers:** open an invoice → *Apply waiver* (amount + reason; audited). Only bursar/admin.
- **Reminders:** *Outstanding* → send reminder SMS (or rely on auto 3/7/14-day reminders).
- **Export:** revenue/aging reports → CSV/PDF.

## Super Admin (Mobiwave)
- **Tenants:** create/onboard school, view per-tenant usage (users, payments, SMS volume) for billing/support.
- **Platform:** monitor uptime, error rate, M-Pesa success rate, notification delivery. Manage global config + secrets (vault).

## Audit & Safety
- Every action is in *Audit Log* (actor, time, change). Use it for accountability disputes.
- Never delete a student with unpaid fees — deactivate instead.
- Backups run automatically (daily PITR + weekly cold). Trust the restore drill.
