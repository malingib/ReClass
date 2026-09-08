-- ReClass Migration 20260901171000 — financial cross-domain guards
-- The legacy invoice/reconciliation lifecycle was intentionally retired by
-- 20260731000003. Keep this migration replay-safe: apply tenant-key guards
-- only when those legacy relations still exist (for installations that did
-- not run the destructive retirement migration).

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_id_id
      ON public.payments(tenant_id, id);
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_tenant_id_id
      ON public.invoices(tenant_id, id);
  END IF;

  IF to_regclass('public.payment_reconciliations') IS NOT NULL
     AND to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payment_reconciliations
      DROP CONSTRAINT IF EXISTS payment_reconciliations_payment_id_fkey;
    ALTER TABLE public.payment_reconciliations
      ADD CONSTRAINT payment_reconciliations_payment_tenant_fkey
      FOREIGN KEY (tenant_id, payment_id)
      REFERENCES public.payments(tenant_id, id);

    IF to_regclass('public.invoices') IS NOT NULL THEN
      ALTER TABLE public.payment_reconciliations
        DROP CONSTRAINT IF EXISTS payment_reconciliations_original_invoice_id_fkey;
      ALTER TABLE public.payment_reconciliations
        ADD CONSTRAINT payment_reconciliations_original_invoice_tenant_fkey
        FOREIGN KEY (tenant_id, original_invoice_id)
        REFERENCES public.invoices(tenant_id, id);

      ALTER TABLE public.payment_reconciliations
        DROP CONSTRAINT IF EXISTS payment_reconciliations_reassigned_to_invoice_fkey;
      ALTER TABLE public.payment_reconciliations
        ADD CONSTRAINT payment_reconciliations_reassigned_invoice_tenant_fkey
        FOREIGN KEY (tenant_id, reassigned_to_invoice)
        REFERENCES public.invoices(tenant_id, id);
    END IF;
  END IF;
END $$;
