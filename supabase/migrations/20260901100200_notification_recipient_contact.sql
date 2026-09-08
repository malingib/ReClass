alter table public.notifications add column if not exists recipient text;
-- Legacy notifications tables may predate the queue timestamp used by this index.
alter table public.notifications add column if not exists queued_at timestamptz;
create index if not exists notifications_tenant_recipient_idx on public.notifications(tenant_id,recipient,queued_at desc);
