-- ReClass Migration 20260901172000 — explicit composite uniqueness for tenant-aware FKs
-- PostgreSQL foreign keys may target a suitable non-partial unique index. The
-- legacy database already contains a relation named uq_payments_tenant_id_id,
-- so use distinct idempotent index names rather than creating same-named
-- constraints (which also create same-named backing indexes).

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_id_id_key ON public.payments (tenant_id, id)';
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_tenant_id_id_key ON public.invoices (tenant_id, id)';
  END IF;
END;
$$;
