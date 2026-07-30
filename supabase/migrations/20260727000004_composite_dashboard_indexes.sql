-- High-priority composite index for dashboard queries that filter by tenant_id
-- then order by created_at DESC. Without this index Postgres does a bitmap scan
-- (index on tenant_id + explicit sort), which is slow on tables with 10k+ rows.

CREATE INDEX IF NOT EXISTS idx_payments_tenant_created
  ON public.payments (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created
  ON public.invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_tenant_created
  ON public.students (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
  ON public.notifications (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_created
  ON public.teacher_attendance (tenant_id, created_at DESC);
