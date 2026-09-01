-- ReClass financial integrity smoke tests.
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM pg_constraint
  WHERE conrelid='public.invoices'::regclass AND conname='uq_invoices_tenant_id_id';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Missing invoice tenant composite uniqueness'; END IF;

  SELECT count(*) INTO v_count FROM pg_constraint
  WHERE conrelid='public.payments'::regclass AND conname='uq_payments_tenant_id_id';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Missing payment tenant composite uniqueness'; END IF;

  SELECT count(*) INTO v_count FROM pg_indexes
  WHERE schemaname='public' AND indexname='uq_payments_tenant_checkout';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Missing tenant checkout idempotency index'; END IF;

  SELECT count(*) INTO v_count FROM pg_indexes
  WHERE schemaname='public' AND indexname='uq_payroll_runs_tenant_teacher_period_domain';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Missing payroll domain uniqueness index'; END IF;

  SELECT count(*) INTO v_count FROM pg_constraint
  WHERE conname='payment_reconciliations_payment_tenant_fkey';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Missing tenant-aware payment FK'; END IF;
END;
$$;
