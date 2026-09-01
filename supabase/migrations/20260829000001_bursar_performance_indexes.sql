-- Bursar & parent-payments pagination indexes
-- These pages now use server-side pagination (50 rows) with search on receipt_no/phone/mpesa_receipt/bank_reference
-- and channel filter on domain. Without indexes the count + range queries scan the whole payments table.

create index if not exists idx_payments_tenant_status_created on public.payments (tenant_id, status, created_at desc) where deleted_at is null;
create index if not exists idx_payments_tenant_domain_status on public.payments (tenant_id, domain, status) where deleted_at is null;
create index if not exists idx_payments_receipt_phone on public.payments (tenant_id, receipt_no, phone) where status = 'paid' and deleted_at is null;
create index if not exists idx_students_tenant_admission on public.students (tenant_id, admission_no) where deleted_at is null;
