-- Payroll is separate from receipts. One successful payment gets one receipt.
-- Payroll is a weekly consolidated control document; receipts are individual payment documents.

create table if not exists public.payroll_committee_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  rights jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  unique(tenant_id,user_id)
);

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','submitted','principal_approved','payment_initiated','payment_approved','paid','closed','returned')),
  created_by uuid not null,
  submitted_by uuid,
  submitted_at timestamptz,
  principal_approved_by uuid,
  principal_approved_at timestamptz,
  payment_initiated_by uuid,
  payment_initiated_at timestamptz,
  payment_approved_by uuid,
  payment_approved_at timestamptz,
  paid_at timestamptz,
  returned_by uuid,
  return_reason text,
  created_at timestamptz not null default now(),
  unique(tenant_id,period_start,period_end)
);

create table if not exists public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payroll_periods(id) on delete cascade,
  teacher_user_id uuid not null,
  gross_amount numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_amount numeric(12,2) generated always as (gross_amount-deductions) stored,
  notes text,
  created_at timestamptz not null default now(),
  unique(payroll_id,teacher_user_id)
);

create table if not exists public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payroll_periods(id) on delete restrict,
  teacher_user_id uuid not null,
  amount numeric(12,2) not null,
  payment_reference text,
  status text not null default 'pending' check (status in ('pending','initiated','approved','processing','paid','failed')),
  initiated_by uuid,
  initiated_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(payroll_id,teacher_user_id)
);

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  payment_id uuid,
  payment_domain text not null check (payment_domain in ('school_fee','reclass','payroll','other')),
  payer_user_id uuid,
  recipient_user_id uuid,
  student_id uuid,
  teacher_user_id uuid,
  amount numeric(12,2) not null,
  currency text not null default 'KES',
  receipt_number text not null unique,
  payment_reference text,
  payment_method text,
  paid_at timestamptz not null default now(),
  confirmation_status text not null default 'not_required' check (confirmation_status in ('not_required','pending','confirmed')),
  confirmed_by uuid,
  confirmed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payroll_periods_tenant_idx on public.payroll_periods(tenant_id,period_start desc);
create index if not exists payroll_lines_payroll_idx on public.payroll_lines(payroll_id);
create index if not exists payroll_payments_teacher_idx on public.payroll_payments(teacher_user_id,created_at desc);
create index if not exists receipts_tenant_paid_idx on public.payment_receipts(tenant_id,paid_at desc);
create index if not exists receipts_teacher_idx on public.payment_receipts(teacher_user_id,paid_at desc);
create index if not exists receipts_student_idx on public.payment_receipts(student_id,paid_at desc);

-- Receipt numbering is intentionally generated server-side and is independent of payroll numbering.
create or replace function public.next_payment_receipt_number()
returns text language plpgsql security definer set search_path=public as $$
declare n bigint;
begin
  select count(*) + 1 into n from public.payment_receipts;
  return 'RCT-' || to_char(now(),'YYYYMM') || '-' || lpad(n::text,6,'0');
end; $$;

-- Explicit teacher confirmation: only the intended recipient can confirm their own payroll receipt.
create or replace function public.confirm_teacher_payment_receipt(p_receipt_id uuid)
returns public.payment_receipts language plpgsql security definer set search_path=public as $$
declare r public.payment_receipts;
begin
  select * into r from public.payment_receipts where id=p_receipt_id for update;
  if not found then raise exception 'Receipt not found'; end if;
  if r.teacher_user_id is null or r.teacher_user_id <> auth.uid() then raise exception 'Only the payment recipient can confirm this receipt'; end if;
  if r.confirmation_status='confirmed' then return r; end if;
  update public.payment_receipts set confirmation_status='confirmed',confirmed_by=auth.uid(),confirmed_at=now() where id=p_receipt_id returning * into r;
  insert into public.audit_logs(actor_user_id,action,module,entity_type,entity_id,target_user_id,source,result,metadata)
  values(auth.uid(),'teacher_receipt_confirmed','payroll','payment_receipt',r.id,auth.uid(),'web','success',jsonb_build_object('receipt_number',r.receipt_number,'amount',r.amount));
  return r;
end; $$;

-- Payment approval creates the individual receipt and queues the automatic teacher notification.
create or replace function public.finalize_payroll_payment_approval(p_payment_id uuid)
returns public.payroll_payments language plpgsql security definer set search_path=public as $$
declare p public.payroll_payments; r public.payment_receipts; template_id uuid; begin
  select * into p from public.payroll_payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.status not in ('initiated','pending') then raise exception 'Payment is not awaiting approval'; end if;
  if p.initiated_by is not null and p.initiated_by=auth.uid() then raise exception 'Payment initiator cannot approve the same payment'; end if;
  update public.payroll_payments set status='approved',approved_by=auth.uid(),approved_at=now() where id=p.id returning * into p;
  insert into public.payment_receipts(tenant_id,payment_id,payment_domain,recipient_user_id,teacher_user_id,amount,receipt_number,payment_reference,payment_method,confirmation_status,metadata)
  select pp.tenant_id,p.id,'payroll',p.teacher_user_id,p.teacher_user_id,p.amount,public.next_payment_receipt_number(),p.payment_reference,'payroll',case when p.status='paid' then 'pending' else 'pending' end,jsonb_build_object('payroll_id',p.payroll_id)
  from public.payroll_periods pp where pp.id=p.payroll_id
  on conflict (payment_id) do nothing returning * into r;
  select id into template_id from public.notification_templates where key='PAYMENT_APPROVED_TEACHER' and channel='in_app' and active=true order by version desc limit 1;
  if template_id is not null then
    insert into public.notifications(tenant_id,event_key,template_id,recipient_user_id,channel,status,subject,body,entity_type,entity_id,triggered_by_user_id,metadata)
    select pp.tenant_id,'PAYMENT_APPROVED_TEACHER',template_id,p.teacher_user_id,'in_app','queued','Payroll payment approved',
      'Your payment of KES '||to_char(p.amount,'FM999,999,990.00')||' has been approved. Once the funds reach you, confirm receipt in eShule.',
      'payroll_payment',p.id,auth.uid(),jsonb_build_object('receipt_id',r.id,'receipt_number',r.receipt_number,'period',pp.period_start||' to '||pp.period_end)
    from public.payroll_periods pp where pp.id=p.payroll_id;
  end if;
  insert into public.audit_logs(actor_user_id,action,module,entity_type,entity_id,target_user_id,source,result,metadata)
  values(auth.uid(),'payment_approved','payroll','payroll_payment',p.id,p.teacher_user_id,'web','success',jsonb_build_object('receipt_id',r.id,'amount',p.amount));
  return p;
end; $$;
