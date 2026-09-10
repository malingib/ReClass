-- ReClass production security regression checks.
-- Run against a production-like database with psql/CI credentials.

begin;

do $$
declare v_count integer;
begin
  select count(*) into v_count
  from pg_class c
  where c.relnamespace='public'::regnamespace
    and c.relname in ('sessions','session_occurrences','teacher_attendance','payments','payment_receipts','reclass_obligations','reclass_paybill_transactions','remedial_paybill_operators','remedial_paybill_settings')
    and c.relrowsecurity;
  if v_count <> 9 then raise exception 'RLS regression: expected 9 protected ReClass lifecycle tables, found %',v_count; end if;
end $$;

do $$
begin
  if has_table_privilege('authenticated','public.teacher_attendance','INSERT') or has_table_privilege('authenticated','public.teacher_attendance','UPDATE') or has_table_privilege('authenticated','public.teacher_attendance','DELETE') then raise exception 'Privilege regression: authenticated can directly mutate teacher_attendance'; end if;
  if has_table_privilege('authenticated','public.payments','INSERT') or has_table_privilege('authenticated','public.payments','UPDATE') or has_table_privilege('authenticated','public.payments','DELETE') then raise exception 'Privilege regression: authenticated can directly mutate payments'; end if;
  if has_table_privilege('authenticated','public.payment_receipts','INSERT') or has_table_privilege('authenticated','public.payment_receipts','UPDATE') or has_table_privilege('authenticated','public.payment_receipts','DELETE') then raise exception 'Privilege regression: authenticated can directly mutate payment_receipts'; end if;
end $$;

do $$
begin
  if has_function_privilege('anon','public.reconcile_reclass_paybill_transaction(uuid,text,text,numeric,text,uuid,uuid)','EXECUTE') then raise exception 'Privilege regression: anon can reconcile PayBill transactions'; end if;
  if has_function_privilege('authenticated','public.reconcile_reclass_paybill_transaction(uuid,text,text,numeric,text,uuid,uuid)','EXECUTE') then raise exception 'Privilege regression: authenticated can reconcile PayBill transactions'; end if;
  if not has_function_privilege('service_role','public.reconcile_reclass_paybill_transaction(uuid,text,text,numeric,text,uuid,uuid)','EXECUTE') then raise exception 'Privilege regression: service_role cannot reconcile PayBill transactions'; end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.sessions'::regclass and conname='sessions_time_order_check') then raise exception 'Missing sessions_time_order_check'; end if;
  if not exists (select 1 from pg_constraint where conrelid='public.session_occurrences'::regclass and conname='session_occurrences_time_order_check') then raise exception 'Missing session_occurrences_time_order_check'; end if;
  if not exists (select 1 from pg_constraint where conrelid='public.teacher_attendance'::regclass and conname='teacher_attendance_status_check') then raise exception 'Missing teacher_attendance_status_check'; end if;
end $$;

rollback;
