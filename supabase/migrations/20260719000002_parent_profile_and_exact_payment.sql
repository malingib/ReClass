-- Parent portals must resolve ownership from an authenticated profile, not a
-- tenant-wide query or a browser-supplied invoice identifier.
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id);

UPDATE public.parents parent
SET profile_id = profile.id
FROM public.profiles profile
JOIN auth.users auth_user ON auth_user.id = profile.id
WHERE parent.profile_id IS NULL
  AND parent.tenant_id = profile.tenant_id
  AND parent.email IS NOT NULL
  AND lower(parent.email) = lower(auth_user.email);

CREATE UNIQUE INDEX IF NOT EXISTS parents_profile_id_key
  ON public.parents(profile_id) WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS guardians_link_parent_id_idx ON public.guardians_link(parent_id);
CREATE INDEX IF NOT EXISTS guardians_link_student_id_idx ON public.guardians_link(student_id);

-- Reconcile the invoice originally attached to the checkout request. Locking
-- the invoice prevents duplicate callbacks from over-crediting its balance.
DROP FUNCTION IF EXISTS public.reconcile_payment(text, numeric, text, uuid);
CREATE FUNCTION public.reconcile_payment(
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
  v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'invalid_amount');
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id AND tenant_id = p_tenant_id
  FOR UPDATE;

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
    RETURN jsonb_build_object('status', 'overpayment', 'invoice_id', v_invoice.id, 'balance', v_balance);
  END IF;

  INSERT INTO public.payments (invoice_id, tenant_id, amount, phone, method, mpesa_checkout_id, status)
  VALUES (v_invoice.id, p_tenant_id, p_amount, p_phone, 'mpesa', p_checkout_id, 'paid')
  RETURNING id INTO v_payment_id;

  UPDATE public.invoices
  SET amount_paid = coalesce(amount_paid, 0) + p_amount,
      status = CASE WHEN coalesce(amount_paid, 0) + p_amount >= amount_due THEN 'paid' ELSE 'partial' END
  WHERE id = v_invoice.id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('status', 'completed', 'invoice_id', v_invoice.id, 'payment_id', v_payment_id);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_payment(text, uuid, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, uuid, numeric, text, uuid) TO service_role;
