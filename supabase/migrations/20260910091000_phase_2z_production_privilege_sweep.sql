revoke insert, update, delete, truncate on public.reclass_committee_roles from authenticated;
revoke insert, update, delete, truncate on public.reclass_committee_assignments from authenticated;
revoke insert, update, delete, truncate on public.reclass_committee_rights from authenticated;
revoke insert, update, delete, truncate on public.reclass_fee_definition from authenticated;
revoke insert, update, delete, truncate on public.reclass_obligations from authenticated;
revoke insert, update, delete, truncate on public.remedial_committee_members from authenticated;
revoke insert, update, delete, truncate on public.remedial_committee_role_definitions from authenticated;
revoke insert, update, delete, truncate on public.remedial_committee_role_assignments from authenticated;
revoke insert, update, delete, truncate on public.remedial_committee_rights from authenticated;

revoke all on public.reclass_committee_roles from anon;
revoke all on public.reclass_committee_assignments from anon;
revoke all on public.reclass_committee_rights from anon;
revoke all on public.reclass_fee_definition from anon;
revoke all on public.reclass_obligations from anon;
revoke all on public.remedial_committee_members from anon;
revoke all on public.remedial_committee_role_definitions from anon;
revoke all on public.remedial_committee_role_assignments from anon;
revoke all on public.remedial_committee_rights from anon;

revoke execute on function public.get_attendance_overview(uuid,date,date) from public,anon;
grant execute on function public.get_attendance_overview(uuid,date,date) to authenticated;
revoke execute on function public.remedial_paybill_governance_status(uuid) from public,anon;
grant execute on function public.remedial_paybill_governance_status(uuid) to authenticated;

revoke execute on function public.current_user_has_reclass_permission(text) from public,anon;
grant execute on function public.current_user_has_reclass_permission(text) to authenticated;
revoke execute on function public.current_user_has_reclass_any_permission(text[]) from public,anon;
grant execute on function public.current_user_has_reclass_any_permission(text[]) to authenticated;

revoke execute on function public.manage_reclass_paybill_operator(uuid,uuid,uuid,text,smallint,boolean,timestamptz,timestamptz) from public,anon;
grant execute on function public.manage_reclass_paybill_operator(uuid,uuid,uuid,text,smallint,boolean,timestamptz,timestamptz) to authenticated;
revoke execute on function public.update_reclass_paybill_settings(uuid,text,text,smallint,smallint,boolean,boolean) from public,anon;
grant execute on function public.update_reclass_paybill_settings(uuid,text,text,smallint,smallint,boolean,boolean) to authenticated;
