revoke insert, update, delete, truncate on public.payments from authenticated;
revoke insert, update, delete, truncate on public.teacher_attendance from authenticated;
revoke insert, update, delete, truncate on public.unmatched_payments from authenticated;

revoke all on public.payments from anon;
revoke all on public.teacher_attendance from anon;
revoke all on public.unmatched_payments from anon;

revoke execute on function public.mark_own_teacher_attendance(uuid,uuid,uuid,uuid,text) from public, anon;
grant execute on function public.mark_own_teacher_attendance(uuid,uuid,uuid,uuid,text) to authenticated;
revoke execute on function public.review_teacher_attendance(uuid,uuid,uuid,text,text) from public, anon;
grant execute on function public.review_teacher_attendance(uuid,uuid,uuid,text,text) to authenticated;

revoke execute on function public.reconcile_payment(text,numeric,text,uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.reconcile_payment(text,numeric,text,uuid,uuid,uuid,text) to service_role;
