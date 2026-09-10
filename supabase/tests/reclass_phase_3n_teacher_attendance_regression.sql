begin;

do $$ begin
  if not has_function_privilege('authenticated','public.mark_own_teacher_attendance(uuid,uuid,uuid,uuid,text)','EXECUTE') then raise exception 'Teacher attendance RPC unavailable'; end if;
  if not has_function_privilege('authenticated','public.review_teacher_attendance(uuid,uuid,uuid,text,text)','EXECUTE') then raise exception 'Attendance review RPC unavailable'; end if;
  if has_function_privilege('anon','public.mark_own_teacher_attendance(uuid,uuid,uuid,uuid,text)','EXECUTE') then raise exception 'Teacher attendance RPC exposed to anon'; end if;
  if has_function_privilege('anon','public.review_teacher_attendance(uuid,uuid,uuid,text,text)','EXECUTE') then raise exception 'Attendance review RPC exposed to anon'; end if;
end $$;

do $$ declare body text; begin
  select pg_get_functiondef(p.oid) into body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mark_own_teacher_attendance' and pg_get_function_identity_arguments(p.oid)='p_tenant_id uuid, p_teacher_id uuid, p_profile_id uuid, p_occurrence_id uuid, p_status text';
  if body is null then raise exception 'Missing teacher attendance function'; end if;
  if body not like '%p_status not in (''attended'',''absent'')%' then raise exception 'Teacher attendance status boundary missing'; end if;
  if body like '%set status=''done''%' then raise exception 'Teacher marking must not complete occurrences before approval'; end if;
end $$;

rollback;
