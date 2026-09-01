-- Shared audit + notification foundation for eShule/ReClass.
-- Audit answers WHO did WHAT, to WHICH record, WHEN, WHY and RESULT.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  actor_user_id uuid,
  actor_type text not null default 'user' check (actor_type in ('user','system')),
  action text not null,
  module text not null,
  entity_type text,
  entity_id uuid,
  target_user_id uuid,
  reason text,
  before_data jsonb,
  after_data jsonb,
  source text,
  result text not null default 'success' check (result in ('success','failure','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_created_idx on public.audit_logs(tenant_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  key text not null,
  name text not null,
  channel text not null check (channel in ('in_app','sms','email','whatsapp')),
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, key, channel, version)
);

create table if not exists public.notification_triggers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  event_key text not null,
  template_id uuid not null references public.notification_templates(id),
  enabled boolean not null default true,
  recipient_rule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  event_key text,
  template_id uuid references public.notification_templates(id),
  recipient_user_id uuid,
  channel text not null check (channel in ('in_app','sms','email','whatsapp')),
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed')),
  subject text,
  body text not null,
  entity_type text,
  entity_id uuid,
  triggered_by_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  attempts integer not null default 0
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id, queued_at desc);
create index if not exists notifications_entity_idx on public.notifications(entity_type, entity_id, queued_at desc);

-- Standard event catalogue. Triggers/templates can be activated per tenant/channel.
insert into public.notification_templates (tenant_id,key,name,channel,subject,body,variables)
select null, v.key, v.name, v.channel, v.subject, v.body, v.variables::jsonb
from (values
 ('PAYROLL_SUBMITTED','Payroll submitted','in_app','Payroll submitted for principal approval','Payroll {{period}} has been submitted for your approval.','["period"]'),
 ('PAYROLL_APPROVED','Payroll approved','in_app','Payroll approved','Payroll {{period}} has been approved and is ready for payment initiation.','["period"]'),
 ('PAYMENT_INITIATED','Payment initiated','in_app','Payment batch awaiting approval','Payment batch {{reference}} has been initiated and requires approval.','["reference"]'),
 ('PAYMENT_APPROVED_TEACHER','Teacher payment approved','in_app','Payroll payment approved','Your payment of KES {{amount}} for {{period}} has been approved. Once the funds reach you, confirm receipt in eShule.','["amount","period"]'),
 ('TEACHER_RECEIPT_CONFIRMED','Teacher confirmed payment','in_app','Payment receipt confirmed','{{teacher_name}} confirmed receipt of payment {{reference}}.','["teacher_name","reference"]'),
 ('SCHOOL_PAYMENT_RECEIVED','School payment received','in_app','Payment received','A payment of KES {{amount}} has been received for {{student_name}}.','["amount","student_name"]'),
 ('RECLASS_PAYMENT_RECEIVED','ReClass payment received','in_app','ReClass payment received','A ReClass payment of KES {{amount}} has been received for {{student_name}}.','["amount","student_name"]'),
 ('ATTENDANCE_SUBMITTED','Teacher attendance submitted','in_app','Teacher attendance awaiting approval','{{teacher_name}} submitted {{status}} attendance for {{date}}.','["teacher_name","status","date"]'),
 ('ATTENDANCE_APPROVED','Teacher attendance approved','in_app','Attendance approved','Your teacher attendance for {{date}} has been approved.','["date"]'),
 ('ATTENDANCE_REJECTED','Teacher attendance returned','in_app','Attendance requires attention','Your teacher attendance for {{date}} was returned for review.','["date"]')
) as v(key,name,channel,subject,body,variables)
where not exists (select 1 from public.notification_templates t where t.tenant_id is null and t.key=v.key and t.channel=v.channel and t.version=1);

-- Immutable audit intent: application code should insert, never update/delete audit records.
revoke update, delete on public.audit_logs from public;
