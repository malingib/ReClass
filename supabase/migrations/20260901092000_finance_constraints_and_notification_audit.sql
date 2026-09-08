-- Harden shared finance primitives after the operations/finance/comms migration.
-- The canonical payroll model is public.payroll_runs; this migration must not
-- recreate or reference the retired payroll_periods/payroll_payments model.

create unique index if not exists payment_receipts_payment_uidx
  on public.payment_receipts(payment_id)
  where payment_id is not null;

create sequence if not exists public.payment_receipt_seq;

create or replace function public.next_payment_receipt_number()
returns text
language sql
security definer
set search_path=public
as $$
  select 'RCT-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.payment_receipt_seq')::text,6,'0');
$$;

-- Keep audit records append-only at the database privilege level.
revoke update, delete on public.audit_logs from anon, authenticated;
