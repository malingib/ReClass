-- ============================================================================
-- ReClass Migration 0003 — idempotent payment reconciliation (PLANNING DRAFT)
-- Called ONLY from mpesa-callback. Credits invoice once per payment id.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_payment(
  p_payment_id uuid,
  p_invoice_id uuid,
  p_mpesa_receipt text,
  p_amount numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- lock the payment row to serialize concurrent callbacks
  PERFORM 1 FROM public.payments WHERE id = p_payment_id FOR UPDATE;

  UPDATE public.payments
    SET status = 'completed', mpesa_receipt = p_mpesa_receipt,
        paid_amount = p_amount, paid_at = now(), raw = COALESCE(raw,'{}'::jsonb)
  WHERE id = p_payment_id AND status <> 'completed';

  -- credit invoice (idempotent: add only if not already applied)
  INSERT INTO public.invoice_credits (invoice_id, payment_id, amount, created_at)
  SELECT p_invoice_id, p_payment_id, p_amount, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invoice_credits WHERE payment_id = p_payment_id
  );

  -- recompute invoice balance
  UPDATE public.invoices i
    SET paid = (SELECT COALESCE(SUM(amount),0) FROM public.invoice_credits c WHERE c.invoice_id = i.id),
        status = CASE WHEN (i.amount - (SELECT COALESCE(SUM(amount),0) FROM public.invoice_credits c WHERE c.invoice_id = i.id)) <= 0
                      THEN 'paid' ELSE 'partial' END
  WHERE i.id = p_invoice_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_payment(uuid,uuid,text,numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(uuid,uuid,text,numeric) TO service_role;
