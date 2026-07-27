--------------------------------------------------------------------------
-- Fix 1: Rebuild reconcile_payment — remove manual UPDATE (trigger does it)
--         and record overpayments to payment_reconciliations
--------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reconcile_payment(text, uuid, numeric, text, uuid);

CREATE OR REPLACE FUNCTION public.reconcile_payment(
  p_checkout_id text,
  p_invoice_id uuid,
  p_amount numeric,
  p_phone text,
  p_tenant_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_payment_id uuid;
  v_reconciliation_id uuid;
  v_balance numeric;
  v_overpayment numeric;
  v_applied numeric;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'invalid_amount');
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;                     -- guard against concurrent waiver

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invoice_not_found');
  END IF;

  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE mpesa_checkout_id = p_checkout_id;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'duplicate', 'invoice_id', v_invoice.id, 'payment_id', v_payment_id);
  END IF;

  v_balance := v_invoice.amount_due - coalesce(v_invoice.amount_paid, 0);

  IF p_amount > v_balance THEN
    v_applied   := v_balance;
    v_overpayment := p_amount - v_balance;
  ELSE
    v_applied   := p_amount;
    v_overpayment := 0;
  END IF;

  -- Always record the paid portion (trg_payment_after_insert will
  -- increment invoices.amount_paid, so we do NOT manually update it here).
  INSERT INTO public.payments (invoice_id, tenant_id, amount, phone, method, mpesa_checkout_id, status)
  VALUES (v_invoice.id, p_tenant_id, v_applied, p_phone, 'mpesa', p_checkout_id, 'paid')
  RETURNING id INTO v_payment_id;

  -- Record any overpayment for manual resolution.
  IF v_overpayment > 0 THEN
    INSERT INTO public.payment_reconciliations (
      tenant_id, payment_id, originally_for, excess_amount, note
    ) VALUES (
      p_tenant_id, v_payment_id, v_invoice.id, v_overpayment,
      jsonb_build_object('source', 'mpesa_overpayment', 'checkout_id', p_checkout_id, 'original_amount', p_amount)
    )
    RETURNING id INTO v_reconciliation_id;

    RETURN jsonb_build_object(
      'status', 'partial_overpayment',
      'invoice_id', v_invoice.id,
      'payment_id', v_payment_id,
      'applied', v_applied,
      'excess', v_overpayment,
      'reconciliation_id', v_reconciliation_id
    );
  END IF;

  RETURN jsonb_build_object('status', 'completed', 'invoice_id', v_invoice.id, 'payment_id', v_payment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_payment(text, uuid, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, uuid, numeric, text, uuid) TO service_role;

--------------------------------------------------------------------------
-- Fix 2: atomic grant_waiver RPC (eliminates race with M-Pesa callback)
--------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_waiver(
  p_invoice_id uuid,
  p_amount numeric,
  p_reason text,
  p_granted_by uuid,
  p_tenant_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_waiver_id uuid;
  v_new_paid numeric;
  v_new_status text;
  v_outstanding numeric;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'invalid_amount', 'message', 'Waiver amount must be positive');
  END IF;

  -- Lock the invoice row to prevent concurrent payment callbacks
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'message', 'Invoice not found');
  END IF;

  IF v_invoice.status IN ('paid', 'waived') THEN
    RETURN jsonb_build_object('status', 'already_settled', 'message', format('Invoice is already %s', v_invoice.status));
  END IF;

  v_outstanding := v_invoice.amount_due - coalesce(v_invoice.amount_paid, 0);
  IF p_amount > v_outstanding THEN
    RETURN jsonb_build_object('status', 'exceeds_balance', 'message', 'Waiver exceeds outstanding balance');
  END IF;

  INSERT INTO public.waivers (tenant_id, invoice_id, amount, reason, granted_by)
  VALUES (p_tenant_id, p_invoice_id, p_amount, p_reason, p_granted_by)
  RETURNING id INTO v_waiver_id;

  v_new_paid := coalesce(v_invoice.amount_paid, 0) + p_amount;
  UPDATE public.invoices
  SET amount_paid = v_new_paid,
      status = CASE WHEN v_new_paid >= v_invoice.amount_due THEN 'waived' ELSE v_invoice.status END
  WHERE id = p_invoice_id;

  INSERT INTO public.audit_log (tenant_id, actor_id, action, entity, entity_id, "before", "after")
  VALUES (p_tenant_id, p_granted_by, 'waiver_granted', 'waivers', v_waiver_id,
    jsonb_build_object('invoice_id', p_invoice_id, 'amount_paid', v_invoice.amount_paid, 'status', v_invoice.status),
    jsonb_build_object('invoice_id', p_invoice_id, 'amount_paid', v_new_paid, 'waiver_amount', p_amount, 'reason', p_reason));

  RETURN jsonb_build_object('status', 'completed', 'waiver_id', v_waiver_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_waiver(uuid, numeric, text, uuid, uuid) TO service_role;

--------------------------------------------------------------------------
-- Fix 3: client-side tenant context helper RPC
--------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;