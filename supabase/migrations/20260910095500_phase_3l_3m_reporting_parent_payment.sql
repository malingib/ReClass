-- ReClass Phase 3L/3M reporting + parent payment read boundaries.
-- Dashboard and parent workflows are exposed through scoped RPCs only.

create or replace function public.get_reclass_dashboard()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v jsonb;
begin
  if not public.current_user_has_reclass_permission('reclass.reports.view') then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'finance',jsonb_build_object('outstanding',coalesce((select sum(greatest(amount-paid_amount,0)) from reclass_obligations where status <> 'cancelled'),0),'obligations',coalesce((select count(*) from reclass_obligations where status <> 'cancelled'),0),'paid',coalesce((select sum(paid_amount) from reclass_obligations where status <> 'cancelled'),0)),
    'attendance',jsonb_build_object('total',coalesce((select count(*) from teacher_attendance where deleted_at is null),0),'attended',coalesce((select count(*) from teacher_attendance where status='attended' and deleted_at is null),0),'absent',coalesce((select count(*) from teacher_attendance where status='absent' and deleted_at is null),0),'pending',coalesce((select count(*) from teacher_attendance where approval_status='pending' and deleted_at is null),0)),
    'programme',jsonb_build_object('scheduled',coalesce((select count(*) from session_occurrences where status='scheduled'),0),'done',coalesce((select count(*) from session_occurrences where status='done'),0),'cancelled',coalesce((select count(*) from session_occurrences where status='cancelled'),0)),
    'paybill',jsonb_build_object('initiated',coalesce((select count(*) from reclass_paybill_transactions where status='initiated'),0),'pending_approval',coalesce((select count(*) from reclass_paybill_transactions where status='pending_approval'),0),'approved',coalesce((select count(*) from reclass_paybill_transactions where status='approved'),0),'submitted',coalesce((select count(*) from reclass_paybill_transactions where status='submitted'),0),'completed',coalesce((select count(*) from reclass_paybill_transactions where status='completed'),0),'failed',coalesce((select count(*) from reclass_paybill_transactions where status='failed'),0))
  ) into v;
  return v;
end $$;
revoke execute on function public.get_reclass_dashboard() from public,anon;
grant execute on function public.get_reclass_dashboard() to authenticated;

create or replace function public.get_parent_reclass_obligations()
returns table(id uuid,student_id uuid,student_name text,admission_no text,fee_name text,period_start date,period_end date,amount numeric,paid_amount numeric,balance numeric,status text)
language sql stable security definer set search_path to 'public' as $$
  select o.id,o.student_id,trim(concat_ws(' ',s.first_name,s.last_name)),s.admission_no,f.name,o.period_start,o.period_end,o.amount,o.paid_amount,greatest(o.amount-o.paid_amount,0),o.status
  from reclass_obligations o join students s on s.id=o.student_id join reclass_fee_definition f on f.id=o.fee_definition_id
  where o.status <> 'cancelled' and s.deleted_at is null and exists(select 1 from guardians_link gl join parents p on p.id=gl.parent_id where gl.student_id=o.student_id and p.profile_id=auth.uid() and p.deleted_at is null);
$$;
revoke execute on function public.get_parent_reclass_obligations() from public,anon;
grant execute on function public.get_parent_reclass_obligations() to authenticated;

create or replace function public.get_parent_reclass_payments()
returns table(id uuid,amount numeric,status text,phone text,checkout_id text,receipt_number text,created_at timestamptz,paid_at timestamptz,student_id uuid)
language sql stable security definer set search_path to 'public' as $$
  select p.id,p.amount,p.status,p.phone,p.mpesa_checkout_id,pr.receipt_number,p.created_at,p.reconciled_at,p.student_id
  from payments p left join payment_receipts pr on pr.payment_id=p.id
  where exists(select 1 from guardians_link gl join parents pa on pa.id=gl.parent_id where gl.student_id=p.student_id and pa.profile_id=auth.uid() and pa.deleted_at is null)
  order by p.created_at desc limit 100;
$$;
revoke execute on function public.get_parent_reclass_payments() from public,anon;
grant execute on function public.get_parent_reclass_payments() to authenticated;

create or replace function public.initiate_parent_reclass_payment(p_obligation_id uuid,p_amount numeric,p_phone text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_student uuid; v_tx jsonb;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select o.student_id into v_student from reclass_obligations o
  where o.id=p_obligation_id and o.status <> 'cancelled' and greatest(o.amount-o.paid_amount,0) >= p_amount
    and exists(select 1 from guardians_link gl join parents pa on pa.id=gl.parent_id where gl.student_id=o.student_id and pa.profile_id=auth.uid() and pa.deleted_at is null);
  if v_student is null then raise exception 'Obligation not available'; end if;
  select public.initiate_reclass_paybill_transaction(p_amount,p_phone,v_student,p_obligation_id,null,jsonb_build_object('channel','parent_portal','initiated_by_profile',auth.uid())) into v_tx;
  return v_tx;
end $$;
revoke execute on function public.initiate_parent_reclass_payment(uuid,numeric,text) from public,anon;
grant execute on function public.initiate_parent_reclass_payment(uuid,numeric,text) to authenticated;

create or replace function public.get_parent_reclass_receipt(p_receipt_id uuid)
returns table(id uuid,receipt_number text,amount numeric,currency text,payment_reference text,payment_method text,paid_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select r.id,r.receipt_number,r.amount,r.currency,r.payment_reference,r.payment_method,r.paid_at
  from payment_receipts r join payments p on p.id=r.payment_id
  where r.id=p_receipt_id and exists(select 1 from guardians_link gl join parents pa on pa.id=gl.parent_id where gl.student_id=p.student_id and pa.profile_id=auth.uid() and pa.deleted_at is null);
$$;
revoke execute on function public.get_parent_reclass_receipt(uuid) from public,anon;
grant execute on function public.get_parent_reclass_receipt(uuid) to authenticated;
