-- Payroll workflow + receipt hooks aligned with the canonical eShule payroll model.
-- The canonical payroll record is public.payroll_runs (not payroll_periods/payroll_payments).

create or replace function public.submit_payroll_for_principal(p_payroll_id uuid)
returns public.payroll_runs
language plpgsql security definer set search_path=public as $$
declare p public.payroll_runs;
begin
  select * into p from public.payroll_runs where id=p_payroll_id for update;
  if not found then raise exception 'Payroll not found'; end if;
  if p.status not in ('draft','returned') then raise exception 'Payroll is not editable at this stage'; end if;
  update public.payroll_runs
    set status='submitted', prepared_by=coalesce(prepared_by, auth.uid()), prepared_at=coalesce(prepared_at, now())
    where id=p.id returning * into p;
  insert into public.audit_logs(tenant_id,actor_id,action,module,entity_type,entity_id,source,result,metadata)
    values(p.tenant_id,auth.uid(),'payroll_submitted','payroll','payroll_run',p.id,'web','success',jsonb_build_object('period_start',p.period_start,'period_end',p.period_end));
  return p;
end; $$;

create or replace function public.approve_payroll_by_principal(p_payroll_id uuid,p_note text default null)
returns public.payroll_runs
language plpgsql security definer set search_path=public as $$
declare p public.payroll_runs; ok boolean;
begin
  select * into p from public.payroll_runs where id=p_payroll_id for update;
  if not found then raise exception 'Payroll not found'; end if;
  select exists(select 1 from public.user_roles where tenant_id=p.tenant_id and user_id=auth.uid() and role='principal') into ok;
  if not ok then raise exception 'Only the principal can approve payroll'; end if;
  if p.status<>'submitted' then raise exception 'Payroll must be submitted before principal approval'; end if;
  update public.payroll_runs
    set status='principal_approved',principal_approved_by=auth.uid(),principal_approved_at=now(),principal_note=p_note
    where id=p.id returning * into p;
  insert into public.audit_logs(tenant_id,actor_id,action,module,entity_type,entity_id,source,result,metadata)
    values(p.tenant_id,auth.uid(),'payroll_principal_approved','payroll','payroll_run',p.id,'web','success',jsonb_build_object('note',p_note));
  return p;
end; $$;

create or replace function public.initiate_payroll_payment(p_payroll_id uuid)
returns public.payroll_runs
language plpgsql security definer set search_path=public as $$
declare p public.payroll_runs; ok boolean;
begin
  select * into p from public.payroll_runs where id=p_payroll_id for update;
  if not found then raise exception 'Payroll not found'; end if;
  if p.status<>'principal_approved' then raise exception 'Payroll must have principal approval first'; end if;
  select exists(select 1 from public.remedial_committee_role_assignments ra join public.remedial_committee_rights rr on rr.assignment_id=ra.id where ra.tenant_id=p.tenant_id and ra.profile_id=auth.uid() and ra.active and rr.right_code='initiate_payments' and rr.granted) into ok;
  if not ok then raise exception 'User is not an authorized payment initiator'; end if;
  update public.payroll_runs set status='payment_initiated',payment_initiated_by=auth.uid(),payment_initiated_at=now() where id=p.id returning * into p;
  return p;
end; $$;

create or replace function public.finalize_payroll_payment_approval(p_payroll_id uuid)
returns public.payroll_runs
language plpgsql security definer set search_path=public as $$
declare p public.payroll_runs; ok boolean;
begin
  select * into p from public.payroll_runs where id=p_payroll_id for update;
  if not found then raise exception 'Payroll not found'; end if;
  if p.status<>'payment_initiated' then raise exception 'Payroll payment must be initiated before approval'; end if;
  if p.payment_initiated_by=auth.uid() then raise exception 'Payment initiator cannot approve the same payroll'; end if;
  select exists(select 1 from public.remedial_committee_role_assignments ra join public.remedial_committee_rights rr on rr.assignment_id=ra.id where ra.tenant_id=p.tenant_id and ra.profile_id=auth.uid() and ra.active and rr.right_code='approve_payments' and rr.granted) into ok;
  if not ok then raise exception 'User is not an authorized payment approver'; end if;
  update public.payroll_runs set status='payment_approved',payment_approved_by=auth.uid(),payment_approved_at=now() where id=p.id returning * into p;
  return p;
end; $$;

-- Generate an individual school-fee receipt immediately when a successful payment is reconciled.
create or replace function public.reconcile_payment(p_checkout_id text,p_amount numeric,p_phone text,p_tenant_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_invoice_id uuid;v_payment_id uuid;v_student_id uuid;
begin
 select id,student_id into v_invoice_id,v_student_id from public.invoices where tenant_id=p_tenant_id and status in('unpaid','partial') order by due_date asc nulls last limit 1 for update skip locked;
 if not found then return jsonb_build_object('status','no_pending_invoice');end if;
 insert into public.payments(invoice_id,tenant_id,amount,phone,method,mpesa_checkout_id,status)values(v_invoice_id,p_tenant_id,p_amount,p_phone,'mpesa',p_checkout_id,'paid')on conflict(mpesa_checkout_id)do update set status='paid',updated_at=now() returning id into v_payment_id;
 update public.invoices set status=case when(amount_paid+p_amount)>=amount_due then 'paid' else 'partial' end,amount_paid=amount_paid+p_amount where id=v_invoice_id;
 return jsonb_build_object('status','completed','invoice_id',v_invoice_id,'payment_id',v_payment_id);
exception when unique_violation then return jsonb_build_object('status','duplicate','checkout_id',p_checkout_id);end; $$;
