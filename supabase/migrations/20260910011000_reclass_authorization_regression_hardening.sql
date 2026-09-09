-- Phase 2G: ReClass authorization regression hardening
-- Align committee authorization helpers with the actual ReClass assignment model.

create or replace function public.can_manage_reclass_committee()
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin','school_admin','principal')
  )
  or exists (
    select 1
    from public.reclass_committee_assignments a
    join public.reclass_committee_roles r on r.id = a.role_id
    where a.profile_id = auth.uid()
      and a.active = true
      and (a.effective_from is null or a.effective_from <= current_date)
      and (a.effective_to is null or a.effective_to >= current_date)
      and r.active = true
      and r.name = 'ReClass Chair'
  );
$$;

create or replace function public.can_view_reclass_committee()
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin','school_admin','principal','teacher','remedial_teacher')
  )
  or exists (
    select 1
    from public.reclass_committee_assignments a
    join public.reclass_committee_roles r on r.id = a.role_id
    where a.profile_id = auth.uid()
      and a.active = true
      and (a.effective_from is null or a.effective_from <= current_date)
      and (a.effective_to is null or a.effective_to >= current_date)
      and r.active = true
      and r.name in ('ReClass Chair','ReClass Secretary','ReClass Treasurer','ReClass Committee Member')
  );
$$;

create or replace function public.appoint_reclass_committee_member(
  p_profile_id uuid,
  p_role_id uuid,
  p_effective_from date default current_date,
  p_effective_to date default null,
  p_notes text default null
)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_assignment_id uuid;
  v_role_name text;
begin
  if auth.uid() is null or not public.can_manage_reclass_committee() then
    raise exception 'Not authorized to manage ReClass committee';
  end if;
  if p_effective_to is not null and p_effective_to < p_effective_from then
    raise exception 'effective_to cannot be before effective_from';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and deleted_at is null) then
    raise exception 'Profile not found';
  end if;
  select name into v_role_name from public.reclass_committee_roles where id = p_role_id and active = true;
  if v_role_name is null then
    raise exception 'Committee role not found or inactive';
  end if;
  if v_role_name <> 'ReClass Chair' and exists (
    select 1 from public.reclass_committee_assignments a
    join public.reclass_committee_roles r on r.id = a.role_id
    where a.profile_id = p_profile_id and a.active = true
      and (a.effective_to is null or a.effective_to >= p_effective_from)
      and r.active = true and r.name = 'ReClass Chair'
  ) then
    raise exception 'A profile cannot hold another ReClass committee role while actively serving as Chair';
  end if;
  update public.reclass_committee_assignments
     set active = false, effective_to = coalesce(effective_to, p_effective_from)
   where profile_id = p_profile_id and role_id = p_role_id and active = true;
  insert into public.reclass_committee_assignments
    (profile_id, role_id, assigned_by, active, effective_from, effective_to, notes)
  values
    (p_profile_id, p_role_id, auth.uid(), true, p_effective_from, p_effective_to, p_notes)
  returning id into v_assignment_id;
  return v_assignment_id;
end;
$$;

create or replace function public.end_reclass_committee_assignment(
  p_assignment_id uuid,
  p_effective_to date default current_date
)
returns boolean
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_from date;
begin
  if auth.uid() is null or not public.can_manage_reclass_committee() then
    raise exception 'Not authorized to manage ReClass committee';
  end if;
  select effective_from into v_from
    from public.reclass_committee_assignments
   where id = p_assignment_id;
  if v_from is null then
    raise exception 'Assignment not found';
  end if;
  if p_effective_to < v_from then
    raise exception 'End date cannot be before effective date';
  end if;
  update public.reclass_committee_assignments
     set active = false, effective_to = p_effective_to
   where id = p_assignment_id and active = true;
  return found;
end;
$$;

revoke execute on function public.appoint_reclass_committee_member(uuid,uuid,date,date,text) from anon;
revoke execute on function public.end_reclass_committee_assignment(uuid,date) from anon;
grant execute on function public.appoint_reclass_committee_member(uuid,uuid,date,date,text) to authenticated;
grant execute on function public.end_reclass_committee_assignment(uuid,date) to authenticated;
