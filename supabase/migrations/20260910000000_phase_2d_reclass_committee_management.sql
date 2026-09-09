-- Phase 2D: ReClass committee membership, dated assignments and committee-level rights.

alter table public.reclass_committee_assignments
  add column if not exists effective_from date not null default current_date,
  add column if not exists effective_to date,
  add column if not exists notes text;

create index if not exists idx_reclass_committee_assignments_active
  on public.reclass_committee_assignments (active, effective_from, effective_to);

create unique index if not exists uq_reclass_committee_assignment_profile_role_active
  on public.reclass_committee_assignments (profile_id, role_id)
  where active = true;

create unique index if not exists uq_reclass_committee_right_assignment_key
  on public.reclass_committee_rights (assignment_id, right_key);

insert into public.reclass_committee_roles (name, description, active)
values
  ('ReClass Chair', 'Leads the ReClass committee and oversees committee operations.', true),
  ('ReClass Secretary', 'Maintains committee records, appointments and operational follow-up.', true),
  ('ReClass Treasurer', 'Oversees ReClass financial operations and payment controls.', true),
  ('ReClass Committee Member', 'Participates in ReClass committee review and decisions.', true)
on conflict (name) do update set description = excluded.description, active = true;

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role = any (array[
  'super_admin'::text,'school_admin'::text,'principal'::text,'teacher'::text,
  'remedial_teacher'::text,'bursar'::text,'payroll'::text,'parent'::text,
  'reclass_chair'::text,'reclass_secretary'::text,'reclass_treasurer'::text,'reclass_member'::text
]));
update public.user_roles set role = 'reclass_member' where role = 'remedial_committee_member';

create or replace function public.enforce_reclass_committee_office_uniqueness()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role_name text; v_existing_count integer;
begin
  if new.active is not true then return new; end if;
  select name into v_role_name from public.reclass_committee_roles where id = new.role_id;
  if v_role_name not in ('ReClass Chair','ReClass Secretary','ReClass Treasurer') then return new; end if;
  select count(*) into v_existing_count from public.reclass_committee_assignments a
    join public.reclass_committee_roles r on r.id = a.role_id
    where a.active = true and r.name = v_role_name and a.id <> new.id;
  if v_existing_count > 0 then
    raise exception 'An active % already exists. End the existing assignment before appointing a new holder.', v_role_name using errcode = '23505';
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_reclass_committee_office_uniqueness on public.reclass_committee_assignments;
create trigger trg_enforce_reclass_committee_office_uniqueness before insert or update of role_id, active
on public.reclass_committee_assignments for each row execute function public.enforce_reclass_committee_office_uniqueness();

create or replace function public.seed_reclass_committee_rights()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role_name text; v_right_key text;
begin
  select name into v_role_name from public.reclass_committee_roles where id = new.role_id;
  if v_role_name = 'ReClass Chair' then
    foreach v_right_key in array array['view_committee','manage_members','view_payments','reconcile_payments'] loop
      insert into public.reclass_committee_rights (assignment_id,right_key,granted_by) values (new.id,v_right_key,new.assigned_by) on conflict (assignment_id,right_key) do nothing;
    end loop;
  elsif v_role_name = 'ReClass Secretary' then
    foreach v_right_key in array array['view_committee','manage_members','view_payments'] loop
      insert into public.reclass_committee_rights (assignment_id,right_key,granted_by) values (new.id,v_right_key,new.assigned_by) on conflict (assignment_id,right_key) do nothing;
    end loop;
  elsif v_role_name = 'ReClass Treasurer' then
    foreach v_right_key in array array['view_committee','view_payments','initiate_payments','approve_payments','reconcile_payments','manage_paybill'] loop
      insert into public.reclass_committee_rights (assignment_id,right_key,granted_by) values (new.id,v_right_key,new.assigned_by) on conflict (assignment_id,right_key) do nothing;
    end loop;
  else
    insert into public.reclass_committee_rights (assignment_id,right_key,granted_by) values (new.id,'view_committee',new.assigned_by) on conflict (assignment_id,right_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_seed_reclass_committee_rights on public.reclass_committee_assignments;
create trigger trg_seed_reclass_committee_rights after insert on public.reclass_committee_assignments
for each row execute function public.seed_reclass_committee_rights();

revoke execute on function public.enforce_reclass_committee_office_uniqueness() from public, anon, authenticated;
revoke execute on function public.seed_reclass_committee_rights() from public, anon, authenticated;
