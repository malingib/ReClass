-- React SPA RLS hardening (2026-09-09).
-- The Vite SPA uses the anon browser client, so every tenant table must enforce
-- tenant isolation in the database. service_role (Edge Functions) bypasses RLS,
-- so privileged flows (payroll-ops, sms-campaign, reports-csv, notify, stk, b2c)
-- keep working unchanged. Idempotent: safe to replay.

create or replace function public.tenant_ids_for_user()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select ur.tenant_id from public.user_roles ur where ur.user_id = auth.uid();
$$;

-- Tables whose rows carry tenant_id and are read from the browser.
do $$
declare
  t text;
  tables text[] := array[
    'students', 'parents', 'teachers',
    'sis_enrollments', 'sis_admissions', 'sis_classes', 'subjects',
    'fee_types', 'invoices', 'payments', 'checkout_requests', 'receipts',
    'payroll_runs', 'teacher_attendance', 'sessions', 'session_occurrences',
    'notifications', 'comm_announcements', 'comm_templates',
    'expenses', 'other_income', 'teacher_tasks', 'school_calendar_events',
    'discipline_cases', 'student_lifecycle_events', 'unmatched_payments',
    'audit_log', 'tenants'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'tenant_read') then
        execute format(
          'create policy tenant_read on public.%I for select to authenticated using (tenant_id in (select public.tenant_ids_for_user()))',
          t);
      end if;
      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'tenant_write_staff') then
        execute format(
          'create policy tenant_write_staff on public.%I for all to authenticated using (tenant_id in (select public.tenant_ids_for_user())) with check (tenant_id in (select public.tenant_ids_for_user()))',
          t);
      end if;
    end if;
  end loop;
end $$;

-- Privileged writes must go through Edge (service_role). Deny direct anon payroll transitions.
do $$
begin
  if to_regclass('public.payroll_runs') is not null then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payroll_runs' and policyname = 'no_anon_write') then
      create policy no_anon_write on public.payroll_runs for all to anon using (false) with check (false);
    end if;
  end if;
end $$;

-- user_roles: users read their own rows; management stays service_role-side.
alter table public.user_roles enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'own_roles_read') then
    create policy own_roles_read on public.user_roles for select to authenticated using (user_id = auth.uid());
  end if;
end $$;
