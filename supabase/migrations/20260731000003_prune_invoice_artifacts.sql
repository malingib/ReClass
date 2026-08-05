------------------------------------------------------------------------------
-- 20260731000003: prune invoice-lifecycle artifacts.
-- The app no longer uses invoices / teacher_invoices / waivers / payment
-- reconciliation (payments ARE receipts). This migration removes the trigger
-- that wrote to invoices on every payment, the dependent views/functions, the
-- dangling FKs, and finally the three deprecated tables.
--
-- NOTE: this is destructive. Rollback = Supabase PITR (Point-In-Time Recovery)
-- to a snapshot before this migration. The data is not needed by the app.
------------------------------------------------------------------------------

-- 1. Drop the payment trigger that updated invoices (else payment inserts break
--    once invoices is gone).
DROP TRIGGER IF EXISTS trg_payment_after_insert ON public.payments;
DROP FUNCTION IF EXISTS public.update_invoice_on_payment() CASCADE;

-- 2. Drop dependent views (join payments<->invoices) in both schemas.
DROP VIEW IF EXISTS public.payment_details CASCADE;
DROP VIEW IF EXISTS public.invoice_details CASCADE;
DROP VIEW IF EXISTS reclass.payment_details CASCADE;
DROP VIEW IF EXISTS reclass.invoice_details CASCADE;

-- 3. Drop the old dashboard-stats function (references invoices; app uses the
--    server-side _dashboard module instead, not this RPC).
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats() CASCADE;

-- 4. Drop FKs that point at the deprecated tables.
ALTER TABLE public.payments          DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE public.checkout_requests DROP CONSTRAINT IF EXISTS checkout_requests_invoice_id_fkey;
ALTER TABLE public.waivers           DROP CONSTRAINT IF EXISTS waivers_invoice_id_fkey;
ALTER TABLE public.payment_reconciliations
  DROP CONSTRAINT IF EXISTS payment_reconciliations_original_invoice_id_fkey;
ALTER TABLE public.payment_reconciliations
  DROP CONSTRAINT IF EXISTS payment_reconciliations_reassigned_to_invoice_fkey;

-- 5. Drop the now-orphaned invoice_id columns.
ALTER TABLE public.payments          DROP COLUMN IF EXISTS invoice_id;
ALTER TABLE public.checkout_requests DROP COLUMN IF EXISTS invoice_id;
ALTER TABLE public.waivers           DROP COLUMN IF EXISTS invoice_id;

-- 6. Drop the deprecated tables.
DROP TABLE IF EXISTS public.teacher_invoices CASCADE;
DROP TABLE IF EXISTS public.waivers CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;

-- 7. payment_reconciliations existed only for invoice overpayment tracking;
--    no app code references it. Drop it too.
DROP TABLE IF EXISTS public.payment_reconciliations CASCADE;
