create or replace function public.appoint_reclass_committee_member(p_profile_id uuid,p_role_id uuid,p_effective_from date default current_date,p_effective_to date default null,p_notes text default null) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_assignment_id uuid; v_role_name text; begin
 if auth.uid() is null or not public.can_manage_reclass_committee() then raise exception 'Not authorized to manage ReClass committee'; end if;
 if p_effective_to is not null and p_effective_to < p_effective_from then raise exception 'effective_to cannot be before effective_from'; end if;
 select name into v_role_name from public.reclass_committee_roles where id=p_role_id and active=true;
 if v_role_name is null then raise exception 'Committee role not found or inactive'; end if;
 if not exists(select 1 from public.profiles where id=p_profile_id and deleted_at is null) then raise exception 'Profile not found'; end if;
 if exists(select 1 from public.reclass_committee_assignments a where a.profile_id=p_profile_id and a.active=true and (a.effective_to is null or a.effective_to>=p_effective_from)) then raise exception 'Profile already has an active ReClass committee assignment'; end if;
 if v_role_name='ReClass Chair' and exists(select 1 from public.reclass_committee_assignments a join public.reclass_committee_roles r on r.id=a.role_id where r.name='ReClass Chair' and a.active=true and (a.effective_to is null or a.effective_to>=p_effective_from)) then raise exception 'An active ReClass Chair already exists'; end if;
 insert into public.reclass_committee_assignments(profile_id,role_id,assigned_by,active,effective_from,effective_to,notes) values(p_profile_id,p_role_id,auth.uid(),true,p_effective_from,p_effective_to,nullif(trim(p_notes),'')) returning id into v_assignment_id;
 return v_assignment_id;
end; $$;

create or replace function public.end_reclass_committee_assignment(p_assignment_id uuid,p_effective_to date default current_date) returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_from date; begin
 if auth.uid() is null or not public.can_manage_reclass_committee() then raise exception 'Not authorized to manage ReClass committee'; end if;
 select effective_from into v_from from public.reclass_committee_assignments where id=p_assignment_id and active=true;
 if v_from is null then raise exception 'Active assignment not found'; end if;
 if p_effective_to < v_from then raise exception 'End date cannot be before effective date'; end if;
 update public.reclass_committee_assignments set active=false,effective_to=p_effective_to where id=p_assignment_id and active=true;
 update public.reclass_committee_rights set active=false where assignment_id=p_assignment_id and active=true;
 return found;
end; $$;

create or replace function public.manage_reclass_committee_right(p_assignment_id uuid,p_right_key text,p_granted boolean default true) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_role text; begin
 if auth.uid() is null or not public.current_user_has_reclass_permission('reclass.committee.manage') then raise exception 'Not authorized to manage ReClass committee rights'; end if;
 select r.name into v_role from public.reclass_committee_assignments a join public.reclass_committee_roles r on r.id=a.role_id where a.id=p_assignment_id and a.active=true;
 if v_role is null then raise exception 'Active committee assignment not found'; end if;
 if p_right_key not in ('view_committee','manage_members','view_payments','initiate_payments','approve_payments','reconcile_payments','manage_paybill') then raise exception 'Invalid committee right'; end if;
 if p_right_key='manage_members' and v_role<>'ReClass Chair' then raise exception 'Only ReClass Chair may hold manage_members'; end if;
 if p_right_key in ('view_payments','reconcile_payments','manage_paybill','initiate_payments','approve_payments') and v_role not in ('ReClass Chair','ReClass Treasurer') then raise exception 'Financial committee right not permitted for this role'; end if;
 insert into public.reclass_committee_rights(assignment_id,right_key,granted_by,active) values(p_assignment_id,p_right_key,auth.uid(),coalesce(p_granted,true)) on conflict(assignment_id,right_key) do update set active=excluded.active,granted_by=auth.uid(),granted_at=now() returning id into v_id;
 return jsonb_build_object('id',v_id,'active',coalesce(p_granted,true));
end; $$;

revoke execute on function public.manage_reclass_committee_right(uuid,text,boolean) from public,anon;
grant execute on function public.manage_reclass_committee_right(uuid,text,boolean) to authenticated;
revoke execute on function public.appoint_reclass_committee_member(uuid,uuid,date,date,text) from public,anon;
grant execute on function public.appoint_reclass_committee_member(uuid,uuid,date,date,text) to authenticated;
revoke execute on function public.end_reclass_committee_assignment(uuid,date) from public,anon;
grant execute on function public.end_reclass_committee_assignment(uuid,date) to authenticated;
