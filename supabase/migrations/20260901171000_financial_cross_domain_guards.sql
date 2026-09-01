-- ReClass Migration 20260901171000 — financial cross-domain guards
-- Foreign-key relationships must not allow a tenant's payment/evidence record
-- to point at another tenant's invoice or reconciliation record.

-- Composite tenant keys used for cross-table integrity.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_tenant_id_id
  ON public.invoices(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_id_id
  ON public.payments(tenant_id, id);

-- Ensure reconciliation rows cannot cross tenant boundaries through their FKs.
ALTER TABLE public.payment_reconciliations
  DROP CONSTRAINT IF EXISTS payment_reconciliations_payment_id_fkey;
ALTER TABLE public.payment_reconciliations
  ADD CONSTRAINT payment_reconciliations_payment_tenant_fkey
  FOREIGN KEY (tenant_id, payment_id)
  REFERENCES public.payments(tenant_id, id);

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
