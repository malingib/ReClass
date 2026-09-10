-- Phase 2K: close broad authenticated read access on sensitive payment/attendance tables.

drop policy if exists payments_authenticated on public.payments;
create policy payments_finance_view on public.payments for select to authenticated
using (public.current_user_has_permission('school.finance.view'));
create policy payments_parent_view on public.payments for select to authenticated
using (exists (
  select 1 from public.guardians_link gl
  join public.parents p on p.id = gl.parent_id
  where gl.student_id = payments.student_id
    and p.profile_id = auth.uid()
    and p.deleted_at is null
));

drop policy if exists teacher_attendance_authenticated on public.teacher_attendance;
create policy teacher_attendance_authorized_view on public.teacher_attendance for select to authenticated
using (
  public.current_user_has_permission('reclass.attendance.view')
  or exists (select 1 from public.teachers t where t.id = teacher_attendance.teacher_id and t.profile_id = auth.uid() and t.deleted_at is null)
);

drop policy if exists unmatched_payments_authenticated on public.unmatched_payments;
create policy unmatched_payments_finance_view on public.unmatched_payments for select to authenticated
using (public.current_user_has_permission('school.finance.view'));
