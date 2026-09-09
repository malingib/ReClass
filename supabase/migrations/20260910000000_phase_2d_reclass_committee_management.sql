-- Phase 2D: ReClass committee membership, dated assignments and committee-level rights.
-- The committee assignment is the operational source of truth; user_roles remains the
-- coarse application role used by navigation/RBAC.

alter table public.reclass_committee_assignments
  add column if not exists effective_from date not null default current_date,
  add column if not exists effective_to date,
  add column if not exists notes text;

create index if not exists idx_reclass_committee_assignments_active
  on public.reclass_committee_assignments (active, effective_from, effective_to);

create unique index if not exists uq_reclass_committee_assignment_profile_role_active
  on public.reclass_committee_assignments (profile_id, role_id)
  where active = true;

create unique index if not exists uq_reclass_committee_single_office_active
  on public.reclass_committee_assignments (role_id)
  where active = true
    and role_id in (
      select id from public.reclass_committee_roles
      where name in ('ReClass Chair', 'ReClass Secretary', 'ReClass Treasurer')
    );

create unique index if not exists uq_reclass_committee_right_assignment_key
  on public.reclass_committee_rights (assignment_id, right_key);

insert into public.reclass_committee_roles (name, description, active)
values
  ('ReClass Chair', 'Leads the ReClass committee and oversees committee operations.', true),
  ('ReClass Secretary', 'Maintains committee records, appointments and operational follow-up.', true),
  ('ReClass Treasurer', 'Oversees ReClass financial operations and payment controls.', true),
  ('ReClass Committee Member', 'Participates in ReClass committee review and decisions.', true)
on conflict (name) do update
set description = excluded.description,
    active = true;

-- Keep user-level role assignment compatible with the role catalog exposed by the UI.
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_check check (
    role = any (array[
      'super_admin'::text,
      'school_admin'::text,
      'principal'::text,
      'teacher'::text,
      'remedial_teacher'::text,
      'bursar'::text,
      'payroll'::text,
      'parent'::text,
      'reclass_chair'::text,
      'reclass_secretary'::text,
      'reclass_treasurer'::text,
      'reclass_member'::text
    ])
  );

-- Preserve compatibility with the earlier generic remedial committee role.
update public.user_roles
set role = 'reclass_member'
where role = 'remedial_committee_member';

create or replace function public.seed_reclass_committee_rights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
  right_key text;
begin
  select name into role_name
  from public.reclass_committee_roles
  where id = new.role_id;

  if role_name = 'ReClass Chair' then
    foreach right_key in array array['view_committee','manage_members','view_payments','reconcile_payments'] loop
      insert into public.reclass_committee_rights (assignment_id, right_key, granted_by)
      values (new.id, right_key, new.assigned_by)
      on conflict (assignment_id, right_key) do nothing;
    end loop;
  elsif role_name = 'ReClass Secretary' then
    foreach right_key in array array['view_committee','manage_members','view_payments'] loop
      insert into public.reclass_committee_rights (assignment_id, right_key, granted_by)
      values (new.id, right_key, new.assigned_by)
      on conflict (assignment_id, right_key) do nothing;
    end loop;
  elsif role_name = 'ReClass Treasurer' then
    foreach right_key in array array['view_committee','view_payments','initiate_payments','approve_payments','reconcile_payments','manage_paybill'] loop
      insert into public.reclass_committee_rights (assignment_id, right_key, granted_by)
      values (new.id, right_key, new.assigned_by)
      on conflict (assignment_id, right_key) do nothing;
    end loop;
  else
    insert into public.reclass_committee_rights (assignment_id, right_key, granted_by)
    values (new.id, 'view_committee', new.assigned_by)
    on conflict (assignment_id, right_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seed_reclass_committee_rights on public.reclass_committee_assignments;
create trigger trg_seed_reclass_committee_rights
after insert on public.reclass_committee_assignments
for each row execute function public.seed_reclass_committee_rights();
