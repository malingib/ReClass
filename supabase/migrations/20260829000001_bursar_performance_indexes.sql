-- Bursar & parent-payments pagination indexes
-- Payments no longer carries deleted_at; lifecycle is represented by payment status/domain state.
create index if not exists idx_payments_tenant_status_created on public.payments (tenant_id, status, created_at desc);
create index if not exists idx_payments_tenant_domain_status on public.payments (tenant_id, domain, status);
create index if not exists idx_payments_receipt_phone on public.payments (tenant_id, receipt_no, phone) where status = 'paid';
create index if not exists idx_students_tenant_admission on public.students (tenant_id, admission_no) where deleted_at is null;
