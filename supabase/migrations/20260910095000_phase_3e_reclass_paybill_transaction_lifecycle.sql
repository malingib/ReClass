create table if not exists public.reclass_paybill_transactions (id uuid primary key default gen_random_uuid(),checkout_id text unique,phone text,amount numeric not null,student_id uuid,obligation_id uuid,account_reference text,status text not null default 'initiated',initiated_by uuid not null default auth.uid(),initiated_at timestamptz not null default now(),approved_by uuid,approved_at timestamptz,approval_level smallint,reconciled_payment_id uuid,reconciled_at timestamptz,failure_reason text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),constraint reclass_paybill_amount_positive check(amount>0),constraint reclass_paybill_status_check check(status in ('initiated','pending_approval','approved','submitted','completed','rejected','failed','cancelled')),constraint reclass_paybill_approval_level_check check(approval_level is null or approval_level>=1),constraint reclass_paybill_approval_metadata_check check(status not in ('approved','completed') or (approved_by is not null and approved_at is not null)));
create index if not exists idx_reclass_paybill_tx_status on public.reclass_paybill_transactions(status,created_at desc);
create index if not exists idx_reclass_paybill_tx_student on public.reclass_paybill_transactions(student_id,created_at desc);
create index if not exists idx_reclass_paybill_tx_initiator on public.reclass_paybill_transactions(initiated_by,created_at desc);
alter table public.reclass_paybill_transactions enable row level security;
revoke all on public.reclass_paybill_transactions from anon;
revoke insert,update,delete,truncate on public.reclass_paybill_transactions from authenticated;
grant select on public.reclass_paybill_transactions to authenticated;
drop policy if exists reclass_paybill_transactions_view on public.reclass_paybill_transactions;
create policy reclass_paybill_transactions_view on public.reclass_paybill_transactions for select to authenticated using(public.current_user_has_reclass_any_permission(array['reclass.finance.view','reclass.finance.report']));
create or replace function public.initiate_reclass_paybill_transaction(p_amount numeric,p_phone text,p_student_id uuid default null,p_obligation_id uuid default null,p_account_reference text default null,p_metadata jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_role text; v_maker_checker boolean; begin
if auth.uid() is null or not public.current_user_has_reclass_permission('reclass.finance.manage') then raise exception 'Not authorized to initiate ReClass PayBill transaction'; end if;
if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
select maker_checker_required into v_maker_checker from public.remedial_paybill_settings limit 1;
select operator_role into v_role from public.remedial_paybill_operators where role_assignment_id in(select id from public.remedial_committee_role_assignments where active and teacher_id=auth.uid()) and active and effective_from<=now() and(effective_to is null or effective_to>=now()) and operator_role in('initiator','manager') order by case when operator_role='initiator' then 1 else 2 end limit 1;
if v_role is null then raise exception 'No active PayBill initiator operator assignment'; end if;
if p_student_id is not null and not exists(select 1 from public.students where id=p_student_id and deleted_at is null) then raise exception 'Student not found'; end if;
if p_obligation_id is not null and not exists(select 1 from public.reclass_obligations where id=p_obligation_id and status<>'cancelled') then raise exception 'Obligation not found'; end if;
insert into public.reclass_paybill_transactions(amount,phone,student_id,obligation_id,account_reference,status,initiated_by,approval_level,metadata) values(p_amount,p_phone,p_student_id,p_obligation_id,p_account_reference,case when coalesce(v_maker_checker,true) then 'pending_approval' else 'approved' end,auth.uid(),case when coalesce(v_maker_checker,true) then 1 else null end,coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
if not coalesce(v_maker_checker,true) then update public.reclass_paybill_transactions set approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=v_id; end if;
return jsonb_build_object('status','ok','transaction_id',v_id,'state',case when coalesce(v_maker_checker,true) then 'pending_approval' else 'approved' end);
end; $$;
create or replace function public.approve_reclass_paybill_transaction(p_transaction_id uuid,p_approval_level smallint default 1) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_tx public.reclass_paybill_transactions%rowtype; v_levels smallint; v_operator uuid; begin
if auth.uid() is null or not public.current_user_has_reclass_permission('reclass.finance.approve') then raise exception 'Not authorized to approve ReClass PayBill transaction'; end if;
if p_approval_level is null or p_approval_level<1 then raise exception 'Invalid approval level'; end if;
select * into v_tx from public.reclass_paybill_transactions where id=p_transaction_id for update;
if not found then raise exception 'Transaction not found'; end if;
if v_tx.status<>'pending_approval' then raise exception 'Transaction is not awaiting approval'; end if;
if v_tx.initiated_by=auth.uid() then raise exception 'Initiator cannot approve own transaction'; end if;
select approval_levels into v_levels from public.remedial_paybill_settings limit 1;
if p_approval_level>coalesce(v_levels,1) then raise exception 'Approval level exceeds configured workflow'; end if;
select o.id into v_operator from public.remedial_paybill_operators o where o.role_assignment_id in(select id from public.remedial_committee_role_assignments where active and teacher_id=auth.uid()) and o.active and o.operator_role in('approver','manager') and o.approval_level=p_approval_level and o.effective_from<=now() and(o.effective_to is null or o.effective_to>=now()) limit 1;
if v_operator is null then raise exception 'No active operator authorization for this approval level'; end if;
update public.reclass_paybill_transactions set status=case when p_approval_level>=coalesce(v_levels,1) then 'approved' else 'pending_approval' end,approved_by=auth.uid(),approved_at=now(),approval_level=p_approval_level,updated_at=now() where id=p_transaction_id;
return jsonb_build_object('status','ok','transaction_id',p_transaction_id,'state',case when p_approval_level>=coalesce(v_levels,1) then 'approved' else 'pending_approval' end);
end; $$;
create or replace function public.cancel_reclass_paybill_transaction(p_transaction_id uuid) returns boolean language plpgsql security definer set search_path to 'public' as $$ begin
if auth.uid() is null or not public.current_user_has_reclass_permission('reclass.finance.manage') then raise exception 'Not authorized'; end if;
update public.reclass_paybill_transactions set status='cancelled',updated_at=now() where id=p_transaction_id and status in('initiated','pending_approval','approved','submitted'); return found; end; $$;
revoke execute on function public.initiate_reclass_paybill_transaction(numeric,text,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.initiate_reclass_paybill_transaction(numeric,text,uuid,uuid,text,jsonb) to authenticated;
revoke execute on function public.approve_reclass_paybill_transaction(uuid,smallint) from public,anon;
grant execute on function public.approve_reclass_paybill_transaction(uuid,smallint) to authenticated;
revoke execute on function public.cancel_reclass_paybill_transaction(uuid) from public,anon;
grant execute on function public.cancel_reclass_paybill_transaction(uuid) to authenticated;
