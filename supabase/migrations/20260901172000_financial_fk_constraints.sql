-- ReClass Migration 20260901172000 — explicit composite uniqueness for tenant-aware FKs
-- PostgreSQL foreign keys must target a primary key or a suitable non-partial
-- unique constraint/index. Keep explicit constraints for predictable migration replay.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_invoices_tenant_id_id'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT uq_invoices_tenant_id_id UNIQUE (tenant_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_payments_tenant_id_id'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT uq_payments_tenant_id_id UNIQUE (tenant_id, id);
  END IF;
END;
$$;
