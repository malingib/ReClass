create or replace function public.reconcile_payment(p_checkout_id text,p_amount numeric,p_phone text,p_tenant_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_invoice_id uuid;v_payment_id uuid;v_student_id uuid;begin
 select invoice_id into v_invoice_id from public.checkout_requests where checkout_id=p_checkout_id and tenant_id=p_tenant_id limit 1;
 if v_invoice_id is null then select id into v_invoice_id from public.invoices where tenant_id=p_tenant_id and status in('unpaid','partial') order by due_date asc nulls last limit 1 for update skip locked; end if;
 if v_invoice_id is null then return jsonb_build_object('status','no_pending_invoice');end if;
 select student_id into v_student_id from public.invoices where id=v_invoice_id and tenant_id=p_tenant_id for update;
 if v_student_id is null then return jsonb_build_object('status','invalid_invoice');end if;
 insert into public.payments(invoice_id,tenant_id,amount,phone,method,mpesa_checkout_id,status)values(v_invoice_id,p_tenant_id,p_amount,p_phone,'mpesa',p_checkout_id,'paid')on conflict(mpesa_checkout_id)do update set status='paid',updated_at=now() returning id into v_payment_id;
 update public.invoices set status=case when(amount_paid+p_amount)>=amount_due then 'paid' else 'partial' end,amount_paid=amount_paid+p_amount where id=v_invoice_id;
 insert into public.payment_receipts(tenant_id,payment_id,payment_domain,payer_user_id,student_id,amount,receipt_number,payment_reference,payment_method,paid_at,confirmation_status,metadata)values(p_tenant_id,v_payment_id,'school_fee',null,v_student_id,p_amount,public.next_payment_receipt_number(),p_checkout_id,'mpesa',now(),'not_required',jsonb_build_object('invoice_id',v_invoice_id))on conflict(payment_id)do nothing;
 return jsonb_build_object('status','completed','invoice_id',v_invoice_id,'payment_id',v_payment_id,'receipt_id',(select id from public.payment_receipts where payment_id=v_payment_id));
exception when unique_violation then return jsonb_build_object('status','duplicate','checkout_id',p_checkout_id);end;$$;
