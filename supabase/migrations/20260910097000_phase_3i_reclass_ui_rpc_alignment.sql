create or replace function public.manage_reclass_paybill_operator(p_operator_id uuid,p_committee_member_id uuid,p_role_assignment_id uuid,p_operator_role text,p_approval_level smallint,p_active boolean,p_effective_from timestamptz,p_effective_to timestamptz default null) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; begin
 if not public.current_user_has_reclass_permission('reclass.finance.manage') then raise exception 'Not authorized'; end if;
 if p_operator_role not in ('initiator','approver','manager','auditor') then raise exception 'Invalid operator role'; end if;
 if p_approval_level is null or p_approval_level<1 then raise exception 'Approval level must be >= 1'; end if;
 if p_effective_from is null then raise exception 'effective_from required'; end if;
 if p_effective_to is not null and p_effective_to<p_effective_from then raise exception 'effective_to cannot precede effective_from'; end if;
 if p_active and p_role_assignment_id is null then raise exception 'Active operator requires committee role assignment'; end if;
 if p_role_assignment_id is not null and not exists(select 1 from public.reclass_committee_assignments a where a.id=p_role_assignment_id and a.active=true) then raise exception 'Committee role assignment must be active'; end if;
 if p_operator_id is null then
   insert into public.remedial_paybill_operators(committee_member_id,operator_role,approval_level,active,effective_from,effective_to,role_assignment_id)
   values(p_committee_member_id,p_operator_role,p_approval_level,p_active,p_effective_from,p_effective_to,p_role_assignment_id) returning id into v_id;
 else
   update public.remedial_paybill_operators set committee_member_id=p_committee_member_id,operator_role=p_operator_role,approval_level=p_approval_level,active=p_active,effective_from=p_effective_from,effective_to=p_effective_to,role_assignment_id=p_role_assignment_id where id=p_operator_id returning id into v_id;
   if v_id is null then raise exception 'Operator not found'; end if;
 end if;
 return jsonb_build_object('status','ok','operator_id',v_id);
end; $$;
revoke execute on function public.manage_reclass_paybill_operator(uuid,uuid,uuid,text,smallint,boolean,timestamptz,timestamptz) from public,anon;
grant execute on function public.manage_reclass_paybill_operator(uuid,uuid,uuid,text,smallint,boolean,timestamptz,timestamptz) to authenticated;

create or replace function public.initiate_reclass_paybill_transaction(p_amount numeric,p_phone text,p_student_id uuid default null,p_obligation_id uuid default null,p_account_reference text default null,p_metadata jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_role text; v_maker_checker boolean; begin
 if auth.uid() is null or not public.current_user_has_reclass_permission('reclass.finance.manage') then raise exception 'Not authorized to initiate ReClass PayBill transaction'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
 select maker_checker_required into v_maker_checker from public.remedial_paybill_settings limit 1;
 select operator_role into v_role from public.remedial_paybill_operators o join public.reclass_committee_assignments a on a.id=o.role_assignment_id where a.profile_id=auth.uid() and a.active and o.active and o.effective_from<=now() and(o.effective_to is null or o.effective_to>=now()) and o.operator_role in('initiator','manager') order by case when o.operator_role='initiator' then 1 else 2 end limit 1;
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
 select o.id into v_operator from public.remedial_paybill_operators o join public.reclass_committee_assignments a on a.id=o.role_assignment_id where a.profile_id=auth.uid() and a.active and o.active and o.operator_role in('approver','manager') and o.approval_level=p_approval_level and o.effective_from<=now() and(o.effective_to is null or o.effective_to>=now()) limit 1;
 if v_operator is null then raise exception 'No active operator authorization for this approval level'; end if;
 update public.reclass_paybill_transactions set status=case when p_approval_level>=coalesce(v_levels,1) then 'approved' else 'pending_approval' end,approved_by=auth.uid(),approved_at=now(),approval_level=p_approval_level,updated_at=now() where id=p_transaction_id;
 return jsonb_build_object('status','ok','transaction_id',p_transaction_id,'state',case when p_approval_level>=coalesce(v_levels,1) then 'approved' else 'pending_approval' end);
end; $$;

revoke execute on function public.initiate_reclass_paybill_transaction(numeric,text,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.initiate_reclass_paybill_transaction(numeric,text,uuid,uuid,text,jsonb) to authenticated;
revoke execute on function public.approve_reclass_paybill_transaction(uuid,smallint) from public,anon;
grant execute on function public.approve_reclass_paybill_transaction(uuid,smallint) to authenticated;