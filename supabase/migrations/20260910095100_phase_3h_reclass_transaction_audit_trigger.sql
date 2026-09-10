create or replace function public.audit_reclass_paybill_transaction_transition()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op='INSERT' then
    insert into public.audit_logs(actor_id,actor_label,action,module,entity_type,entity_id,target_label,before_data,after_data,source,result,metadata,created_at)
    values(coalesce(auth.uid(),new.initiated_by),'ReClass Finance','payment.initiated','ReClass','reclass_paybill_transaction',new.id,'reclass_paybill_transaction:'||new.id::text,null,to_jsonb(new),'reclass_backend','success','{}'::jsonb,now());
  elsif old.status is distinct from new.status then
    insert into public.audit_logs(actor_id,actor_label,action,module,entity_type,entity_id,target_label,before_data,after_data,source,result,metadata,created_at)
    values(coalesce(auth.uid(),new.approved_by,new.initiated_by),'ReClass Finance',
      case new.status when 'pending_approval' then 'payment.pending_approval' when 'approved' then 'payment.approved' when 'submitted' then 'payment.submitted' when 'completed' then 'payment.completed' when 'rejected' then 'payment.rejected' when 'failed' then 'payment.failed' when 'cancelled' then 'payment.cancelled' else 'payment.status_changed' end,
      'ReClass','reclass_paybill_transaction',new.id,'reclass_paybill_transaction:'||new.id::text,
      jsonb_build_object('status',old.status,'updated_at',old.updated_at),
      jsonb_build_object('status',new.status,'updated_at',new.updated_at,'approved_by',new.approved_by,'approved_at',new.approved_at,'failure_reason',new.failure_reason),
      'reclass_backend','success',jsonb_build_object('from_status',old.status,'to_status',new.status),now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_reclass_paybill_transaction_transition on public.reclass_paybill_transactions;
create trigger trg_audit_reclass_paybill_transaction_transition
after insert or update of status on public.reclass_paybill_transactions
for each row execute function public.audit_reclass_paybill_transaction_transition();
revoke execute on function public.audit_reclass_paybill_transaction_transition() from public,anon,authenticated;
