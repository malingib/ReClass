create or replace function public.current_user_has_reclass_permission(p_permission text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or p.code = p_permission)
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
      and p_permission in (
        case r.name
          when 'ReClass Chair' then 'reclass.committee.manage'
          when 'ReClass Secretary' then 'reclass.attendance.manage'
          when 'ReClass Treasurer' then 'reclass.finance.manage'
          when 'ReClass Committee Member' then 'reclass.committee.view'
          when 'Remedial Teacher' then 'reclass.attendance.manage'
          else null
        end
      )
  );
$$;

drop policy if exists reclass_fee_definition_manage on public.reclass_fee_definition;
create policy reclass_fee_definition_manage on public.reclass_fee_definition
for all to authenticated using (public.current_user_has_reclass_permission('reclass.finance.manage'))
with check (public.current_user_has_reclass_permission('reclass.finance.manage'));

drop policy if exists reclass_obligations_manage on public.reclass_obligations;
create policy reclass_obligations_manage on public.reclass_obligations
for all to authenticated using (public.current_user_has_reclass_permission('reclass.finance.manage'))
with check (public.current_user_has_reclass_permission('reclass.finance.manage'));

drop policy if exists remedial_paybill_operators_manage on public.remedial_paybill_operators;
create policy remedial_paybill_operators_manage on public.remedial_paybill_operators
for all to authenticated using (public.current_user_has_reclass_permission('reclass.finance.manage'))
with check (public.current_user_has_reclass_permission('reclass.finance.manage'));

drop policy if exists remedial_paybill_settings_manage on public.remedial_paybill_settings;
create policy remedial_paybill_settings_manage on public.remedial_paybill_settings
for all to authenticated using (public.current_user_has_reclass_permission('reclass.finance.manage'))
with check (public.current_user_has_reclass_permission('reclass.finance.manage'));

update public.remedial_paybill_settings
set initiator_may_approve_own_transaction = false
where maker_checker_required = true and initiator_may_approve_own_transaction = true;

create unique index if not exists uq_reclass_paybill_operator_active_assignment
on public.remedial_paybill_operators (role_assignment_id, operator_role, approval_level)
where active = true and role_assignment_id is not null;
