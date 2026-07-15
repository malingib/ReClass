-- Trigger: maintain invoice amount_paid and status
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    UPDATE public.invoices SET
      amount_paid = amount_paid + NEW.amount,
      status = CASE
        WHEN (amount_paid + NEW.amount) >= amount_due THEN 'paid'
        ELSE 'partial'
      END
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_payment_after_insert ON public.payments;
CREATE TRIGGER trg_payment_after_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_on_payment();

-- updated_at trigger for tables with updated_at column
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['tenants','profiles','students','sessions','payments','checkout_requests','credentials'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END $$;
