-- Phase 3H: ReClass receipt lifecycle + immutable audit trail

create unique index if not exists uq_payment_receipts_receipt_number
  on public.payment_receipts(receipt_number) where receipt_number is not null;

create unique index if not exists uq_payment_receipts_payment_id
  on public.payment_receipts(payment_id) where payment_id is not null;

alter table public.payment_receipts drop constraint if exists payment_receipts_amount_positive;
alter table public.payment_receipts add constraint payment_receipts_amount_positive check (amount > 0);

alter table public.payment_receipts drop constraint if exists payment_receipts_currency_check;
alter table public.payment_receipts add constraint payment_receipts_currency_check check (currency is null or currency in ('KES'));

revoke insert, update, delete, truncate on public.payment_receipts from authenticated;
revoke all on public.payment_receipts from anon;

create or replace function public.create_payment_receipt_for_reclass_payment(
  p_payment_id uuid, p_transaction_id uuid default null
)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_payment public.payments%rowtype; v_receipt public.payment_receipts%rowtype; v_receipt_number text;
begin
  if auth.uid() is null then raise exception 'Backend receipt creation only'; end if;
  select * into v_payment from public.payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if coalesce(v_payment.status,'') <> 'paid' then raise exception 'Only paid payments can receive a receipt'; end if;
  if exists(select 1 from public.payment_receipts where payment_id=p_payment_id) then
    select * into v_receipt from public.payment_receipts where payment_id=p_payment_id limit 1;
    return jsonb_build_object('id',v_receipt.id,'receipt_number',v_receipt.receipt_number,'created',false);
  end if;
  v_receipt_number := public.next_payment_receipt_number();
  insert into public.payment_receipts(payment_id,receipt_number,payer_profile_id,beneficiary_id,domain,amount,currency,payment_reference,payment_method,paid_at,metadata,created_at)
  values(v_payment.id,v_receipt_number,null,v_payment.student_id,coalesce(v_payment.domain,'reclass'),v_payment.amount,'KES',coalesce(v_payment.mpesa_receipt,v_payment.mpesa_checkout_id,v_payment.bank_reference,v_payment.receipt_no),coalesce(v_payment.method,'M-Pesa'),coalesce(v_payment.reconciled_at,v_payment.updated_at,v_payment.created_at),jsonb_build_object('source','reclass_paybill','payment_id',v_payment.id,'transaction_id',p_transaction_id,'mpesa_checkout_id',v_payment.mpesa_checkout_id,'mpesa_receipt',v_payment.mpesa_receipt,'phone',v_payment.phone),now())
  returning * into v_receipt;
  return jsonb_build_object('id',v_receipt.id,'receipt_number',v_receipt.receipt_number,'created',true);
end; $$;

revoke execute on function public.create_payment_receipt_for_reclass_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_payment_receipt_for_reclass_payment(uuid,uuid) to service_role;

create or replace function public.prevent_payment_receipt_mutation()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if old.payment_id is distinct from new.payment_id or old.receipt_number is distinct from new.receipt_number or old.amount is distinct from new.amount or old.payment_reference is distinct from new.payment_reference or old.paid_at is distinct from new.paid_at then
    raise exception 'Issued payment receipt is immutable';
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_payment_receipt_mutation on public.payment_receipts;
create trigger trg_prevent_payment_receipt_mutation before update on public.payment_receipts for each row execute function public.prevent_payment_receipt_mutation();
revoke execute on function public.prevent_payment_receipt_mutation() from public,anon,authenticated;

create or replace function public.record_reclass_audit(p_action text,p_entity_type text,p_entity_id uuid,p_before jsonb default null,p_after jsonb default null,p_reason text default null,p_result text default 'success',p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Backend audit recording only'; end if;
  insert into public.audit_logs(actor_id,actor_label,action,module,entity_type,entity_id,target_label,reason,before_data,after_data,source,result,metadata,created_at)
  values(auth.uid(),'System',p_action,'ReClass',p_entity_type,p_entity_id,p_entity_type||':'||p_entity_id::text,p_reason,p_before,p_after,'reclass_backend',p_result,coalesce(p_metadata,'{}'::jsonb),now()) returning id into v_id;
  return v_id;
end; $$;

revoke execute on function public.record_reclass_audit(text,text,uuid,jsonb,jsonb,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_reclass_audit(text,text,uuid,jsonb,jsonb,text,text,jsonb) to service_role;

-- Reconciliation atomically settles the obligation, issues a receipt, and records completion.
create or replace function public.reconcile_reclass_paybill_transaction(p_transaction_id uuid,p_checkout_id text,p_mpesa_receipt text,p_amount numeric,p_phone text,p_student_id uuid default null,p_obligation_id uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_tx public.reclass_paybill_transactions%rowtype; v_payment public.payments%rowtype; v_receipt jsonb; v_obligation jsonb;
begin
  if auth.uid() is null then raise exception 'Backend reconciliation only'; end if;
  if nullif(trim(p_checkout_id),'') is null then raise exception 'Checkout ID is required'; end if;
  if nullif(trim(p_mpesa_receipt),'') is null then raise exception 'M-Pesa receipt is required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  select * into v_tx from public.reclass_paybill_transactions where id=p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status='completed' then
    if v_tx.checkout_id is distinct from p_checkout_id then raise exception 'Completed transaction checkout mismatch'; end if;
    v_receipt := (select jsonb_build_object('id',r.id,'receipt_number',r.receipt_number,'created',false) from public.payment_receipts r where r.payment_id=v_tx.reconciled_payment_id limit 1);
    return jsonb_build_object('status','duplicate','transaction_id',v_tx.id,'payment_id',v_tx.reconciled_payment_id,'receipt',v_receipt);
  end if;
  if v_tx.status not in ('approved','submitted') then raise exception 'Transaction is not ready for reconciliation'; end if;
  if v_tx.checkout_id is not null and v_tx.checkout_id <> p_checkout_id then raise exception 'Checkout ID mismatch'; end if;
  if v_tx.amount <> p_amount then raise exception 'Reconciled amount does not match transaction amount'; end if;
  select * into v_payment from public.payments where mpesa_checkout_id=p_checkout_id for update;
  if found then
    if v_payment.amount <> p_amount then raise exception 'Existing payment amount mismatch'; end if;
    if v_payment.status <> 'paid' then
      update public.payments set status='paid',mpesa_receipt=coalesce(mpesa_receipt,p_mpesa_receipt),phone=coalesce(phone,p_phone),reconciled_at=coalesce(reconciled_at,now()),updated_at=now() where id=v_payment.id;
    end if;
  else
    insert into public.payments(amount,method,mpesa_checkout_id,mpesa_receipt,phone,status,reconciled_at,student_id,domain,created_at,updated_at)
    values(p_amount,'M-Pesa',p_checkout_id,p_mpesa_receipt,p_phone,'paid',now(),coalesce(p_student_id,v_tx.student_id),'reclass',now(),now()) returning * into v_payment;
  end if;
  if v_tx.obligation_id is not null then v_obligation := public.apply_reclass_payment_to_obligation(v_tx.obligation_id,p_amount);
  elsif p_obligation_id is not null then v_obligation := public.apply_reclass_payment_to_obligation(p_obligation_id,p_amount); end if;
  v_receipt := public.create_payment_receipt_for_reclass_payment(v_payment.id,v_tx.id);
  update public.reclass_paybill_transactions set checkout_id=p_checkout_id,status='completed',reconciled_payment_id=v_payment.id,reconciled_at=now(),updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('mpesa_receipt',p_mpesa_receipt,'receipt',v_receipt) where id=v_tx.id;
  perform public.record_reclass_audit('payment.reconciled','reclass_paybill_transaction',v_tx.id,jsonb_build_object('status',v_tx.status),jsonb_build_object('status','completed','payment_id',v_payment.id,'receipt',v_receipt,'obligation',v_obligation),null,'success',jsonb_build_object('checkout_id',p_checkout_id,'mpesa_receipt',p_mpesa_receipt,'amount',p_amount));
  return jsonb_build_object('status','completed','transaction_id',v_tx.id,'payment_id',v_payment.id,'receipt',v_receipt,'obligation',v_obligation);
end; $$;

revoke execute on function public.reconcile_reclass_paybill_transaction(uuid,text,text,numeric,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reconcile_reclass_paybill_transaction(uuid,text,text,numeric,text,uuid,uuid) to service_role;
