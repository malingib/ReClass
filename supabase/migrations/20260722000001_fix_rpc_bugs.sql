--------------------------------------------------------------------------
-- Fix 1: Add columns to payment_reconciliations for overpayment tracking
--         (reconcile_payment RPC inserts original_invoice_id & excess_amount)
--------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_reconciliations' AND column_name = 'original_invoice_id') THEN
    ALTER TABLE public.payment_reconciliations
      ADD COLUMN original_invoice_id uuid REFERENCES public.invoices(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_reconciliations' AND column_name = 'excess_amount') THEN
    ALTER TABLE public.payment_reconciliations
      ADD COLUMN excess_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

--------------------------------------------------------------------------
-- Fix 2: Rebuild reconcile_payment — use correct column names
--         (original_invoice_id, excess_amount, note instead of notes)
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
    v_applied   := v_balance;
    v_overpayment := p_amount - v_balance;
  ELSE
    v_applied   := p_amount;
    v_overpayment := 0;
  END IF;

  INSERT INTO public.payments (invoice_id, tenant_id, amount, phone, method, mpesa_checkout_id, status)
  VALUES (v_invoice.id, p_tenant_id, v_applied, p_phone, 'mpesa', p_checkout_id, 'paid')
  RETURNING id INTO v_payment_id;

  IF v_overpayment > 0 THEN
    INSERT INTO public.payment_reconciliations (
      tenant_id, payment_id, original_invoice_id, excess_amount, note
    ) VALUES (
      p_tenant_id, v_payment_id, v_invoice.id, v_overpayment,
      jsonb_build_object('source', 'mpesa_overpayment', 'checkout_id', p_checkout_id, 'original_amount', p_amount)::text
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
-- Fix 3: aggregate_payroll_counts — use correct column name
--         (occurrence_id, not session_occurrence_id)
--------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aggregate_payroll_counts(
  p_tenant_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE(teacher_id uuid, occurrences_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT ta.teacher_id, count(*)::bigint
    FROM public.teacher_attendance ta
    JOIN public.session_occurrences so ON ta.occurrence_id = so.id
    WHERE ta.tenant_id = p_tenant_id
      AND ta.approval_status = 'approved'
      AND ta.deleted_at IS NULL
      AND ta.status IN ('present', 'late')
      AND so.occurs_on >= p_period_start
      AND so.occurs_on <= p_period_end
    GROUP BY ta.teacher_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aggregate_payroll_counts(uuid, date, date) TO service_role;
