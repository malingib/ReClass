-- Drop the legacy 4-arg reconcile_payment overload; the callback uses the
-- 5-arg (p_invoice_id) version. Keeping both risks ambiguous RPC dispatch.
DROP FUNCTION IF EXISTS public.reconcile_payment(text, numeric, text, uuid);
