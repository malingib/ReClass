-- ReClass tenant isolation smoke checks.
-- This file is intentionally executable against the local Supabase database.
-- It validates structural constraints that must hold before the application tests.

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'uq_payroll_runs_tenant_teacher_period_domain';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Missing payroll domain uniqueness index';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'uq_payments_tenant_checkout';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Missing tenant-scoped payment idempotency index';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conname = 'payment_reconciliations_payment_tenant_fkey';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Missing tenant-aware payment reconciliation FK';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conname = 'payment_reconciliations_original_invoice_tenant_fkey';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Missing tenant-aware original invoice FK';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conname = 'payment_reconciliations_reassigned_invoice_tenant_fkey';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Missing tenant-aware reassigned invoice FK';
  END IF;
END;
$$;
