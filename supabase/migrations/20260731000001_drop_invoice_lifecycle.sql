------------------------------------------------------------------------------
-- Drop the invoice lifecycle: payments become self-contained receipts.
-- Additive + reversible: existing invoice/teacher_invoice/waiver rows are kept
-- (read-only, deprecated) and FKs are made nullable rather than dropped, so no
-- historical data is destroyed and the change can be undone.
------------------------------------------------------------------------------

-- 1. payments: stand alone as a receipt -------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'student_id') THEN
    ALTER TABLE public.payments
      ADD COLUMN student_id uuid REFERENCES public.students(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'fee_type_id') THEN
    ALTER TABLE public.payments
      ADD COLUMN fee_type_id uuid REFERENCES public.fee_types(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'domain') THEN
    ALTER TABLE public.payments
      ADD COLUMN domain text NOT NULL DEFAULT 'school'
        CHECK (domain IN ('school', 'remedial'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'receipt_no') THEN
    ALTER TABLE public.payments
      ADD COLUMN receipt_no text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payments' AND column_name = 'cashier_id') THEN
    ALTER TABLE public.payments
      ADD COLUMN cashier_id uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- invoice_id no longer mandatory: a payment is now its own receipt.
ALTER TABLE public.payments ALTER COLUMN invoice_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_feetype ON public.payments(fee_type_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON public.payments(receipt_no);

-- 2. checkout_requests: invoice_id optional (parent now pays a fee_type) ------
ALTER TABLE public.checkout_requests ALTER COLUMN invoice_id DROP NOT NULL;

-- 3. waivers: keep table for history, invoice linkage optional ----------------
ALTER TABLE public.waivers ALTER COLUMN invoice_id DROP NOT NULL;

-- 4. Reconciliation: stamp the payment as reconciled (no invoice math) --------
DROP FUNCTION IF EXISTS public.reconcile_payment(text, uuid, numeric, text, uuid);

CREATE OR REPLACE FUNCTION public.reconcile_payment(
  p_checkout_id text,
  p_amount numeric,
  p_phone text,
  p_tenant_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'invalid_amount');
  END IF;

  -- Idempotent: a payment with this checkout_id already exists?
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE mpesa_checkout_id = p_checkout_id
    AND tenant_id = p_tenant_id;

  IF FOUND THEN
    UPDATE public.payments
      SET status = 'paid', reconciled_at = now()
      WHERE id = v_payment_id;
    RETURN jsonb_build_object('status', 'duplicate', 'payment_id', v_payment_id);
  END IF;

  -- No pending payment recorded yet (e.g. callback beat the app write): create
  -- the receipt directly from the callback payload. student_id/fee_type_id are
  -- resolved upstream via checkout_requests when available; left null here.
  INSERT INTO public.payments (
    tenant_id, amount, phone, method, mpesa_checkout_id, status, reconciled_at
  ) VALUES (
    p_tenant_id, p_amount, p_phone, 'mpesa', p_checkout_id, 'paid', now()
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('status', 'completed', 'payment_id', v_payment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_payment(text, numeric, text, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(text, numeric, text, uuid)
  TO service_role;

-- 5. Waivers made no sense without an invoice balance — remove the RPC --------
DROP FUNCTION IF EXISTS public.grant_waiver(uuid, numeric, text, uuid, uuid);
