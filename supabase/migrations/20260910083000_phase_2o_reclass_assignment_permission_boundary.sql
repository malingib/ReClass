create or replace function public.current_user_has_reclass_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.user_roles ur
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
      and (
        (r.name = 'ReClass Chair' and p_permission in (
          'reclass.attendance.manage','reclass.attendance.view','reclass.reports.view',
          'reclass.teaching.manage','reclass.teaching.view','reclass.committee.manage',
          'reclass.committee.view','reclass.finance.report','reclass.finance.view',
          'reclass.payments.view','reclass.programme.manage','reclass.programme.view'))
        or (r.name = 'ReClass Secretary' and p_permission in (
          'reclass.attendance.manage','reclass.attendance.view','reclass.reports.view',
          'reclass.teaching.manage','reclass.teaching.view','reclass.committee.view',
          'reclass.programme.view'))
        or (r.name = 'ReClass Treasurer' and p_permission in (
          'reclass.attendance.view','reclass.reports.view','reclass.teaching.view',
          'reclass.committee.view','reclass.finance.approve','reclass.finance.manage',
          'reclass.finance.reconcile','reclass.finance.report','reclass.finance.view',
          'reclass.payments.manage','reclass.payments.view','reclass.programme.view'))
        or (r.name = 'ReClass Committee Member' and p_permission in (
          'reclass.attendance.view','reclass.reports.view','reclass.teaching.view',
          'reclass.committee.view','reclass.programme.view'))
      )
  );
$$;

create or replace function public.current_user_has_reclass_any_permission(p_permissions text[])
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from unnest(p_permissions) permission_code
    where public.current_user_has_reclass_permission(permission_code)
  );
$$;

create or replace function public.can_manage_reclass_committee()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.current_user_has_reclass_permission('reclass.committee.manage');
$$;

create or replace function public.can_view_reclass_committee()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.current_user_has_reclass_any_permission(array[
    'reclass.committee.view',
    'reclass.programme.view',
    'reclass.attendance.view',
    'reclass.teaching.view',
    'reclass.finance.view'
  ]);
$$;

revoke execute on function public.create_optimized_attendance_function() from public, anon, authenticated;
revoke execute on function public.current_user_has_reclass_permission(text) from public, anon;
revoke execute on function public.current_user_has_reclass_any_permission(text[]) from public, anon;
grant execute on function public.current_user_has_reclass_permission(text) to authenticated;
grant execute on function public.current_user_has_reclass_any_permission(text[]) to authenticated;
