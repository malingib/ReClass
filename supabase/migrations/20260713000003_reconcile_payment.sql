CREATE OR REPLACE FUNCTION public.reconcile_payment(p_checkout_id text, p_amount numeric, p_phone text, p_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice_id uuid;
  v_payment_id uuid;
BEGIN
  SELECT id INTO v_invoice_id FROM public.invoices
   WHERE tenant_id = p_tenant_id AND status IN ('unpaid','partial')
   ORDER BY due_date ASC LIMIT 1
   FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_pending_invoice');
  END IF;
  INSERT INTO public.payments (invoice_id, tenant_id, amount, phone, method, mpesa_checkout_id, status)
  VALUES (v_invoice_id, p_tenant_id, p_amount, p_phone, 'mpesa', p_checkout_id, 'paid')
  ON CONFLICT (mpesa_checkout_id) DO UPDATE SET status = 'paid', updated_at = now()
  RETURNING id INTO v_payment_id;
  UPDATE public.invoices SET
    status = CASE WHEN (amount_paid + p_amount) >= amount_due THEN 'paid' ELSE 'partial' END,
    amount_paid = amount_paid + p_amount
  WHERE id = v_invoice_id;
  RETURN jsonb_build_object('status', 'completed', 'invoice_id', v_invoice_id, 'payment_id', v_payment_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('status', 'duplicate', 'checkout_id', p_checkout_id);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_payment(text, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, numeric, text, uuid) TO service_role;
