-- ReClass Migration 20260901173000 — payment flow integrity
-- The legacy payment trigger already updates invoices when a paid payment is
-- inserted. Reconciliation must therefore not update invoices a second time.
-- This migration also aligns checkout uniqueness with tenant scoping and adds
-- actual-payment evidence/audit notifications.

-- The original schema declared payments.mpesa_checkout_id UNIQUE globally.
-- Tenant-scoped idempotency is the intended boundary.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_mpesa_checkout_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_checkout
  ON public.payments (tenant_id, mpesa_checkout_id)
  WHERE mpesa_checkout_id IS NOT NULL;

-- M-Pesa receipt numbers are payment evidence. Prevent the same provider
-- receipt from being attached to multiple payments inside a tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_mpesa_receipt
  ON public.payments (tenant_id, mpesa_receipt)
  WHERE mpesa_receipt IS NOT NULL;

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
  v_existing_tenant uuid;
  v_existing_amount numeric;
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

  SELECT id, tenant_id, amount, status
    INTO v_payment_id, v_existing_tenant, v_existing_amount, v_existing_status
  FROM public.payments
  WHERE tenant_id = p_tenant_id
    AND mpesa_checkout_id = p_checkout_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_amount <> p_amount THEN
      RAISE EXCEPTION 'duplicate checkout_id has a different amount';
    END IF;
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'checkout_id', p_checkout_id,
      'payment_id', v_payment_id,
      'payment_status', v_existing_status
    );
  END IF;

  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('unpaid','partial')
  ORDER BY due_date ASC NULLS LAST, created_at ASC
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

  -- Invoice balance/status is maintained by trg_payment_after_insert. Do not
  -- duplicate that accounting mutation here.
  RETURN jsonb_build_object(
    'status', 'completed',
    'invoice_id', v_invoice_id,
    'payment_id', v_payment_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'duplicate', 'checkout_id', p_checkout_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_payment(text, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, numeric, text, uuid) TO service_role;

-- Queue one notification only when a payment first becomes paid. Failed or
-- pending payments never produce a payment-success notification.
CREATE OR REPLACE FUNCTION public.notify_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.notifications (
      tenant_id, channel, recipient, body, status, related_type, related_id, created_at
    ) VALUES (
      NEW.tenant_id,
      'inapp',
      NEW.phone,
      'Payment of KES ' || NEW.amount || ' received successfully.',
      'queued',
      'payment',
      NEW.id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_paid ON public.payments;
CREATE TRIGGER trg_notify_payment_paid
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_paid();

-- Financial audit trail: record payment creation and status transitions.
CREATE OR REPLACE FUNCTION public.audit_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    tenant_id, actor_id, action, entity, entity_id, before, after, created_at
  ) VALUES (
    NEW.tenant_id,
    NULLIF(current_setting('app.user_id', true), '')::uuid,
    CASE WHEN TG_OP = 'INSERT' THEN 'payment.created' ELSE 'payment.updated' END,
    'payment',
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_change ON public.payments;
CREATE TRIGGER trg_audit_payment_change
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_change();
