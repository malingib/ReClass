-- Harden the shared finance primitives introduced in the previous migration.
create unique index if not exists payment_receipts_payment_uidx on public.payment_receipts(payment_id) where payment_id is not null;

create sequence if not exists public.payment_receipt_seq;

create or replace function public.next_payment_receipt_number()
returns text language sql security definer set search_path=public as $$
  select 'RCT-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.payment_receipt_seq')::text,6,'0');
$$;

-- Keep audit records append-only at the database privilege level.
revoke update, delete on public.audit_logs from anon, authenticated;

-- Payment approval must be performed by somebody other than the initiator.
create or replace function public.finalize_payroll_payment_approval(p_payment_id uuid)
returns public.payroll_payments language plpgsql security definer set search_path=public as $$
declare
  p public.payroll_payments;
  r public.payment_receipts;
  template_id uuid;
  tenant uuid;
begin
  select * into p from public.payroll_payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.status <> 'initiated' then raise exception 'Payment must be initiated before approval'; end if;
  if p.initiated_by is not null and p.initiated_by=auth.uid() then raise exception 'Payment initiator cannot approve the same payment'; end if;

  select tenant_id into tenant from public.payroll_periods where id=p.payroll_id;
  update public.payroll_payments set status='approved',approved_by=auth.uid(),approved_at=now() where id=p.id returning * into p;

  insert into public.payment_receipts(tenant_id,payment_id,payment_domain,recipient_user_id,teacher_user_id,amount,receipt_number,payment_reference,payment_method,confirmation_status,metadata)
  values(tenant,p.id,'payroll',p.teacher_user_id,p.teacher_user_id,p.amount,public.next_payment_receipt_number(),p.payment_reference,'payroll','pending',jsonb_build_object('payroll_id',p.payroll_id))
  on conflict (payment_id) do nothing
  returning * into r;

  select id into template_id from public.notification_templates
  where key='PAYMENT_APPROVED_TEACHER' and channel='in_app' and active=true order by version desc limit 1;

  if template_id is not null then
    insert into public.notifications(tenant_id,event_key,template_id,recipient_user_id,channel,status,subject,body,entity_type,entity_id,triggered_by_user_id,metadata)
    select tenant,'PAYMENT_APPROVED_TEACHER',template_id,p.teacher_user_id,'in_app','queued',
      'Payroll payment approved',
      'Your payment of KES '||to_char(p.amount,'FM999,999,990.00')||' has been approved. Once the funds reach you, confirm receipt in eShule.',
      'payroll_payment',p.id,auth.uid(),jsonb_build_object('receipt_id',coalesce(r.id,(select id from public.payment_receipts where payment_id=p.id)));
  end if;

  insert into public.audit_logs(actor_user_id,action,module,entity_type,entity_id,target_user_id,source,result,metadata)
  values(auth.uid(),'payment_approved','payroll','payroll_payment',p.id,p.teacher_user_id,'web','success',jsonb_build_object('receipt_id',coalesce(r.id,(select id from public.payment_receipts where payment_id=p.id)),'amount',p.amount));
  return p;
end; $$;
