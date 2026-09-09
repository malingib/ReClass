-- Phase 2F: finance/reporting RLS hardening.
alter table public.teacher_payment_definitions enable row level security;
alter table public.teacher_payment_lines enable row level security;
alter table public.teacher_payment_receipts enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.notification_event_catalog enable row level security;

create policy teacher_payment_definitions_view on public.teacher_payment_definitions for select to authenticated using (public.current_user_has_permission('school.finance.view'));
create policy teacher_payment_definitions_manage on public.teacher_payment_definitions for all to authenticated using (public.current_user_has_permission('school.finance.manage')) with check (public.current_user_has_permission('school.finance.manage'));
create policy teacher_payment_lines_view on public.teacher_payment_lines for select to authenticated using (public.current_user_has_permission('school.finance.view'));
create policy teacher_payment_lines_manage on public.teacher_payment_lines for all to authenticated using (public.current_user_has_permission('school.finance.manage')) with check (public.current_user_has_permission('school.finance.manage'));
create policy teacher_payment_receipts_finance_view on public.teacher_payment_receipts for select to authenticated using (public.current_user_has_permission('school.finance.view'));
create policy teacher_payment_receipts_teacher_view on public.teacher_payment_receipts for select to authenticated using (exists (select 1 from public.teachers t where t.id=teacher_payment_receipts.teacher_id and t.profile_id=auth.uid() and t.deleted_at is null));
create policy teacher_payment_receipts_manage on public.teacher_payment_receipts for all to authenticated using (public.current_user_has_permission('school.finance.manage')) with check (public.current_user_has_permission('school.finance.manage'));
create policy payment_receipts_finance_view on public.payment_receipts for select to authenticated using (public.current_user_has_permission('school.finance.view'));
create policy payment_receipts_self_view on public.payment_receipts for select to authenticated using (payer_profile_id=auth.uid());
create policy payment_receipts_manage on public.payment_receipts for all to authenticated using (public.current_user_has_permission('school.finance.manage')) with check (public.current_user_has_permission('school.finance.manage'));
create policy notification_event_catalog_authenticated_view on public.notification_event_catalog for select to authenticated using (auth.uid() is not null);
