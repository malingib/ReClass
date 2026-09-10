revoke insert, update, delete, truncate on public.remedial_paybill_operators from authenticated;
revoke insert, update, delete, truncate on public.remedial_paybill_settings from authenticated;

create or replace function public.manage_reclass_paybill_operator(p_operator_id uuid,p_committee_member_id uuid,p_role_assignment_id uuid,p_operator_role text,p_approval_level smallint,p_active boolean,p_effective_from timestamptz,p_effective_to timestamptz default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
 if not public.current_user_has_reclass_permission('reclass.finance.manage') then raise exception 'not authorized'; end if;
 if p_operator_role is null or btrim(p_operator_role)='' then raise exception 'operator role required'; end if;
 if p_approval_level is null or p_approval_level<1 then raise exception 'approval level must be >= 1'; end if;
 if p_effective_from is null then raise exception 'effective_from required'; end if;
 if p_effective_to is not null and p_effective_to<p_effective_from then raise exception 'effective_to cannot precede effective_from'; end if;
 if p_active and p_role_assignment_id is null then raise exception 'active operator requires role assignment'; end if;
 if p_active and p_role_assignment_id is not null and not exists(select 1 from public.remedial_committee_role_assignments r where r.id=p_role_assignment_id and r.active=true) then raise exception 'role assignment must be active'; end if;
 if p_operator_id is null then
  insert into public.remedial_paybill_operators(committee_member_id,operator_role,approval_level,active,effective_from,effective_to,role_assignment_id) values(p_committee_member_id,p_operator_role,p_approval_level,p_active,p_effective_from,p_effective_to,p_role_assignment_id) returning id into v_id;
 else
  update public.remedial_paybill_operators set committee_member_id=p_committee_member_id,operator_role=p_operator_role,approval_level=p_approval_level,active=p_active,effective_from=p_effective_from,effective_to=p_effective_to,role_assignment_id=p_role_assignment_id where id=p_operator_id returning id into v_id;
  if v_id is null then raise exception 'operator not found'; end if;
 end if;
 return jsonb_build_object('status','ok','operator_id',v_id);
end; $$;

create or replace function public.update_reclass_paybill_settings(p_id uuid,p_paybill_number text,p_account_prefix text,p_minimum_web_operators smallint,p_approval_levels smallint,p_maker_checker_required boolean,p_initiator_may_approve_own_transaction boolean) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
 if not public.current_user_has_reclass_permission('reclass.finance.manage') then raise exception 'not authorized'; end if;
 if p_minimum_web_operators<1 then raise exception 'minimum_web_operators must be >= 1'; end if;
 if p_approval_levels<1 then raise exception 'approval_levels must be >= 1'; end if;
 if p_maker_checker_required and p_approval_levels<2 then raise exception 'maker/checker requires at least 2 approval levels'; end if;
 if p_maker_checker_required and p_initiator_may_approve_own_transaction then raise exception 'initiator cannot approve own transaction'; end if;
 update public.remedial_paybill_settings set paybill_number=p_paybill_number,account_prefix=p_account_prefix,minimum_web_operators=p_minimum_web_operators,approval_levels=p_approval_levels,maker_checker_required=p_maker_checker_required,initiator_may_approve_own_transaction=p_initiator_may_approve_own_transaction,updated_at=now(),updated_by=auth.uid() where id=p_id returning id into v_id;
 if v_id is null then raise exception 'settings not found'; end if;
 return jsonb_build_object('status','ok','settings_id',v_id);
end; $$;

revoke execute on function public.manage_reclass_paybill_operator(uuid,uuid,uuid,text,smallint,boolean,timestamptz,timestamptz) from public,anon;
grant execute on function public.manage_reclass_paybill_operator(uuid,uuid,uuid,text,smallint,boolean,timestamptz,timestamptz) to authenticated;
revoke execute on function public.update_reclass_paybill_settings(uuid,text,text,smallint,smallint,boolean,boolean) from public,anon;
grant execute on function public.update_reclass_paybill_settings(uuid,text,text,smallint,smallint,boolean,boolean) to authenticated;
