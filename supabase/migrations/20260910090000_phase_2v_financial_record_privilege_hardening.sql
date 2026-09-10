revoke insert, update, delete, truncate on public.payment_receipts from authenticated;
revoke all on public.payment_receipts from anon;

alter table public.payments
  drop constraint if exists payments_amount_positive;

alter table public.payments
  add constraint payments_amount_positive
  check (amount > 0);

create unique index if not exists payments_receipt_no_key
  on public.payments (receipt_no)
  where receipt_no is not null;

create or replace function public.prevent_payment_reference_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if old.mpesa_checkout_id is distinct from new.mpesa_checkout_id then
    raise exception 'M-Pesa checkout ID is immutable';
  end if;
  if old.receipt_no is distinct from new.receipt_no and old.receipt_no is not null then
    raise exception 'Payment receipt number is immutable';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_payment_reference_mutation() from public, anon, authenticated;

drop trigger if exists trg_prevent_payment_reference_mutation on public.payments;
create trigger trg_prevent_payment_reference_mutation
before update on public.payments
for each row execute function public.prevent_payment_reference_mutation();
