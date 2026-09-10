drop policy if exists reclass_committee_assignments_view on public.reclass_committee_assignments;
create policy reclass_committee_assignments_view on public.reclass_committee_assignments for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists reclass_committee_rights_view on public.reclass_committee_rights;
create policy reclass_committee_rights_view on public.reclass_committee_rights for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists reclass_committee_roles_view on public.reclass_committee_roles;
create policy reclass_committee_roles_view on public.reclass_committee_roles for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists reclass_fee_definition_view on public.reclass_fee_definition;
create policy reclass_fee_definition_view on public.reclass_fee_definition for select to authenticated using (public.current_user_has_reclass_permission('reclass.finance.view') or public.current_user_has_reclass_permission('reclass.finance.report'));

drop policy if exists reclass_obligations_staff_view on public.reclass_obligations;
create policy reclass_obligations_staff_view on public.reclass_obligations for select to authenticated using (public.current_user_has_reclass_permission('reclass.finance.view') or public.current_user_has_reclass_permission('reclass.finance.report'));

drop policy if exists remedial_committee_members_view on public.remedial_committee_members;
create policy remedial_committee_members_view on public.remedial_committee_members for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists remedial_committee_rights_view on public.remedial_committee_rights;
create policy remedial_committee_rights_view on public.remedial_committee_rights for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists remedial_committee_role_assignments_view on public.remedial_committee_role_assignments;
create policy remedial_committee_role_assignments_view on public.remedial_committee_role_assignments for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists remedial_committee_role_definitions_view on public.remedial_committee_role_definitions;
create policy remedial_committee_role_definitions_view on public.remedial_committee_role_definitions for select to authenticated using (public.current_user_has_reclass_permission('reclass.committee.view'));

drop policy if exists remedial_paybill_operators_view on public.remedial_paybill_operators;
create policy remedial_paybill_operators_view on public.remedial_paybill_operators for select to authenticated using (public.current_user_has_reclass_permission('reclass.finance.view'));

drop policy if exists remedial_paybill_settings_view on public.remedial_paybill_settings;
create policy remedial_paybill_settings_view on public.remedial_paybill_settings for select to authenticated using (public.current_user_has_reclass_permission('reclass.finance.view'));

drop policy if exists teacher_attendance_authorized_view on public.teacher_attendance;
create policy teacher_attendance_authorized_view on public.teacher_attendance for select to authenticated using (
  public.current_user_has_reclass_permission('reclass.attendance.view')
  or exists (select 1 from public.teachers t where t.id=teacher_attendance.teacher_id and t.profile_id=auth.uid() and t.deleted_at is null)
);
