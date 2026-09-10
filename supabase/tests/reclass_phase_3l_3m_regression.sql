begin;

do $$ begin
  if not has_function_privilege('anon','public.get_reclass_dashboard()','EXECUTE') = false then raise exception 'Dashboard RPC must reject anon'; end if;
  if not has_function_privilege('authenticated','public.get_reclass_dashboard()','EXECUTE') then raise exception 'Dashboard RPC must allow authenticated'; end if;
  if has_function_privilege('anon','public.get_parent_reclass_obligations()','EXECUTE') then raise exception 'Parent obligations RPC exposed to anon'; end if;
  if not has_function_privilege('authenticated','public.get_parent_reclass_obligations()','EXECUTE') then raise exception 'Parent obligations RPC unavailable'; end if;
  if has_function_privilege('anon','public.initiate_parent_reclass_payment(uuid,numeric,text)','EXECUTE') then raise exception 'Parent payment RPC exposed to anon'; end if;
  if not has_function_privilege('authenticated','public.initiate_parent_reclass_payment(uuid,numeric,text)','EXECUTE') then raise exception 'Parent payment RPC unavailable'; end if;
  if has_function_privilege('authenticated','public.submit_parent_reclass_stk(uuid,text)','EXECUTE') then raise exception 'Service bridge exposed to authenticated'; end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_proc where proname='get_reclass_dashboard') then raise exception 'Missing dashboard RPC'; end if;
  if not exists (select 1 from pg_proc where proname='get_parent_reclass_obligations') then raise exception 'Missing parent obligation RPC'; end if;
  if not exists (select 1 from pg_proc where proname='get_parent_reclass_payments') then raise exception 'Missing parent payments RPC'; end if;
  if not exists (select 1 from pg_proc where proname='get_parent_reclass_receipt') then raise exception 'Missing parent receipt RPC'; end if;
  if not exists (select 1 from pg_proc where proname='initiate_parent_reclass_payment') then raise exception 'Missing parent initiation RPC'; end if;
end $$;

rollback;
