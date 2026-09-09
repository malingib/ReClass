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

  -- Payment reconciliation was intentionally retired with the legacy invoice
  -- lifecycle. Verify the canonical payment model instead of asserting FKs to
  -- a table that no longer exists.
  SELECT count(*) INTO v_count
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'payments'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) LIKE '%tenant_id%';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Missing tenant-aware payment foreign key';
  END IF;

  -- The canonical receipt model is tenant-bound and payment-bound.
  SELECT count(*) INTO v_count
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'payment_receipts'
    AND c.contype = 'f';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Missing payment receipt foreign key';
  END IF;
END;
$$;
