alter table public.reclass_committee_assignments
  drop constraint if exists reclass_committee_assignments_effective_dates_check;

alter table public.reclass_committee_assignments
  add constraint reclass_committee_assignments_effective_dates_check
  check (effective_to is null or effective_from is null or effective_to >= effective_from);

alter table public.reclass_committee_assignments
  drop constraint if exists reclass_committee_assignments_active_requires_effective_from;

alter table public.reclass_committee_assignments
  add constraint reclass_committee_assignments_active_requires_effective_from
  check (not active or effective_from is not null);

create unique index if not exists uq_reclass_committee_active_profile_role
  on public.reclass_committee_assignments(profile_id, role_id)
  where active = true;

alter table public.remedial_paybill_operators
  drop constraint if exists remedial_paybill_operators_effective_dates_check;

alter table public.remedial_paybill_operators
  add constraint remedial_paybill_operators_effective_dates_check
  check (effective_to is null or effective_to >= effective_from);

create or replace function public.validate_reclass_paybill_operator_row()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.active and new.role_assignment_id is not null then
    if not exists (
      select 1
      from public.remedial_committee_role_assignments r
      where r.id = new.role_assignment_id
        and r.active = true
    ) then
      raise exception 'Active PayBill operator requires an active committee role assignment';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_reclass_paybill_operator_row() from public, anon, authenticated;

drop trigger if exists trg_validate_reclass_paybill_operator_row
  on public.remedial_paybill_operators;

create trigger trg_validate_reclass_paybill_operator_row
before insert or update on public.remedial_paybill_operators
for each row execute function public.validate_reclass_paybill_operator_row();
