-- Phase 2J: explicit RPC/table privilege boundary.
revoke execute on function public.appoint_reclass_committee_member(uuid,uuid,date,date,text) from anon;
revoke execute on function public.end_reclass_committee_assignment(uuid,date) from anon;
grant execute on function public.appoint_reclass_committee_member(uuid,uuid,date,date,text) to authenticated;
grant execute on function public.end_reclass_committee_assignment(uuid,date) to authenticated;

revoke all on public.reclass_committee_roles from anon;
revoke all on public.reclass_committee_assignments from anon;
revoke all on public.reclass_committee_rights from anon;
revoke all on public.reclass_fee_definition from anon;
revoke all on public.remedial_committee_members from anon;
revoke all on public.remedial_committee_role_definitions from anon;
revoke all on public.remedial_committee_role_assignments from anon;
revoke all on public.remedial_committee_rights from anon;
revoke all on public.remedial_paybill_operators from anon;
revoke all on public.remedial_paybill_settings from anon;
