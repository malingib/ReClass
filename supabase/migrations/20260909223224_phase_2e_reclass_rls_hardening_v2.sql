-- Phase 2E: ReClass database authorization hardening
-- Bootstrap helpers are defined before policies reference them. Later
-- assignment-aware migrations replace these definitions with the stricter
-- ReClass permission model.
create or replace function public.can_view_reclass_committee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_role('super_admin')
      or public.current_user_has_role('school_admin')
      or public.current_user_has_role('principal');
$$;

create or replace function public.can_manage_reclass_committee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_role('super_admin')
      or public.current_user_has_role('school_admin')
      or public.current_user_has_role('principal');
$$;

revoke all on function public.can_view_reclass_committee() from public;
grant execute on function public.can_view_reclass_committee() to authenticated;
revoke all on function public.can_manage_reclass_committee() from public;
grant execute on function public.can_manage_reclass_committee() to authenticated;

alter table public.reclass_committee_roles enable row level security;
alter table public.reclass_committee_assignments enable row level security;
alter table public.reclass_committee_rights enable row level security;
alter table public.reclass_fee_definition enable row level security;
alter table public.reclass_obligations enable row level security;
alter table public.remedial_committee_members enable row level security;
alter table public.remedial_committee_role_definitions enable row level security;
alter table public.remedial_committee_role_assignments enable row level security;
alter table public.remedial_committee_rights enable row level security;
alter table public.remedial_paybill_operators enable row level security;
alter table public.remedial_paybill_settings enable row level security;

create policy reclass_committee_roles_view on public.reclass_committee_roles for select to authenticated using (public.can_view_reclass_committee());
create policy reclass_committee_roles_manage on public.reclass_committee_roles for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy reclass_committee_assignments_view on public.reclass_committee_assignments for select to authenticated using (public.can_view_reclass_committee());
create policy reclass_committee_assignments_manage on public.reclass_committee_assignments for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy reclass_committee_rights_view on public.reclass_committee_rights for select to authenticated using (public.can_view_reclass_committee());
create policy reclass_committee_rights_manage on public.reclass_committee_rights for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy reclass_fee_definition_view on public.reclass_fee_definition for select to authenticated using (public.can_view_reclass_committee());
create policy reclass_fee_definition_manage on public.reclass_fee_definition for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy reclass_obligations_staff_view on public.reclass_obligations for select to authenticated using (public.can_view_reclass_committee());
create policy reclass_obligations_parent_view on public.reclass_obligations for select to authenticated using (exists (select 1 from public.guardians_link gl join public.parents p on p.id=gl.parent_id where gl.student_id=reclass_obligations.student_id and p.profile_id=auth.uid() and p.deleted_at is null));
create policy reclass_obligations_manage on public.reclass_obligations for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy remedial_committee_members_view on public.remedial_committee_members for select to authenticated using (public.can_view_reclass_committee());
create policy remedial_committee_members_manage on public.remedial_committee_members for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy remedial_committee_role_definitions_view on public.remedial_committee_role_definitions for select to authenticated using (public.can_view_reclass_committee());
create policy remedial_committee_role_definitions_manage on public.remedial_committee_role_definitions for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy remedial_committee_role_assignments_view on public.remedial_committee_role_assignments for select to authenticated using (public.can_view_reclass_committee());
create policy remedial_committee_role_assignments_manage on public.remedial_committee_role_assignments for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy remedial_committee_rights_view on public.remedial_committee_rights for select to authenticated using (public.can_view_reclass_committee());
create policy remedial_committee_rights_manage on public.remedial_committee_rights for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy remedial_paybill_operators_view on public.remedial_paybill_operators for select to authenticated using (public.can_view_reclass_committee());
create policy remedial_paybill_operators_manage on public.remedial_paybill_operators for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());
create policy remedial_paybill_settings_view on public.remedial_paybill_settings for select to authenticated using (public.can_view_reclass_committee());
create policy remedial_paybill_settings_manage on public.remedial_paybill_settings for all to authenticated using (public.can_manage_reclass_committee()) with check (public.can_manage_reclass_committee());

alter function public.set_lesson_updated_at() set search_path = public;
alter function public.validate_lesson_context() set search_path = public;
alter function public.get_dashboard_counts(uuid,date,date) set search_path = public;
alter function public.get_attendance_overview(uuid,date,date) set search_path = public;
alter function public.create_optimized_dashboard_counts_function() set search_path = public;
alter function public.create_optimized_attendance_function() set search_path = public;
alter function public.create_sis_stats_view() set search_path = public;
alter function public.remedial_paybill_governance_status(uuid) set search_path = public;
alter function public.validate_reclass_committee_role_assignment(uuid,uuid,uuid) set search_path = public;
alter function public.validate_reclass_paybill_role_operator(uuid,uuid,text,smallint) set search_path = public;
alter function public.validate_remedial_paybill_operator(uuid,uuid,text,smallint) set search_path = public;
