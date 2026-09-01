alter table public.notifications add column if not exists recipient text;
create index if not exists notifications_tenant_recipient_idx on public.notifications(tenant_id,recipient,queued_at desc);
