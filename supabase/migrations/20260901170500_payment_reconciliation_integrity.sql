-- ReClass Migration 20260901170500 — payment reconciliation integrity
-- A callback may be retried. A retry must not add the same payment amount twice.

CREATE OR REPLACE FUNCTION public.reconcile_payment(
  p_checkout_id text,
  p_amount numeric,
  p_phone text,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_payment_id uuid;
  v_existing_status text;
BEGIN
  IF p_checkout_id IS NULL OR length(trim(p_checkout_id)) = 0 THEN
    RAISE EXCEPTION 'checkout_id is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payment amount must be positive';
  END IF;
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  -- Idempotency gate: an already-recorded checkout must never re-apply its amount.
  SELECT id, status INTO v_payment_id, v_existing_status
  FROM public.payments
  WHERE mpesa_checkout_id = p_checkout_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'checkout_id', p_checkout_id,
      'payment_id', v_payment_id,
      'payment_status', v_existing_status
    );
  END IF;

  -- Lock one eligible invoice for this tenant before creating the payment.
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('unpaid','partial')
  ORDER BY due_date ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_pending_invoice');
  END IF;

  INSERT INTO public.payments (
    invoice_id, tenant_id, amount, phone, method, mpesa_checkout_id, status
  ) VALUES (
    v_invoice_id, p_tenant_id, p_amount, p_phone, 'mpesa', p_checkout_id, 'paid'
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.invoices
  SET status = CASE
      WHEN (amount_paid + p_amount) >= amount_due THEN 'paid'
      ELSE 'partial'
    END,
    amount_paid = amount_paid + p_amount,
    updated_at = now()
  WHERE id = v_invoice_id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'status', 'completed',
    'invoice_id', v_invoice_id,
    'payment_id', v_payment_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- A concurrent callback won the checkout-id race. Treat it as an idempotent retry.
    RETURN jsonb_build_object('status', 'duplicate', 'checkout_id', p_checkout_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_payment(text, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, numeric, text, uuid) TO service_role;
