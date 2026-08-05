--------------------------------------------------------------------------
-- Fix 1: Composite index on invoices(tenant_id, status) for status queries
--------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
  ON public.invoices(tenant_id, status);

--------------------------------------------------------------------------
-- Fix 2: Composite index on notifications(tenant_id, status, channel) for
--         notify worker queue queries
--------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_status_channel
  ON public.notifications(tenant_id, status, channel);

--------------------------------------------------------------------------
-- Fix 3: Add CHECK constraint to prevent zero/negative payments
--------------------------------------------------------------------------
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check
  CHECK (amount > 0);

--------------------------------------------------------------------------
-- Fix 4: Add CHECK constraint to prevent zero/negative waivers
--------------------------------------------------------------------------
ALTER TABLE public.waivers DROP CONSTRAINT IF EXISTS waivers_amount_check;
ALTER TABLE public.waivers ADD CONSTRAINT waivers_amount_check
  CHECK (amount > 0);

--------------------------------------------------------------------------
-- Fix 5: Add CHECK constraint to prevent zero/negative invoices
--------------------------------------------------------------------------
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_amount_due_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_due_check
  CHECK (amount_due >= 0);

--------------------------------------------------------------------------
-- Fix 6: Add CHECK constraint to prevent zero/negative payroll amounts
--------------------------------------------------------------------------
ALTER TABLE public.payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_amount_check;
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_amount_check
  CHECK (amount >= 0);

--------------------------------------------------------------------------
-- Fix 7: Composite index on teacher_attendance(tenant_id, status, marked_at)
--         for principal dashboard queries
--------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_tenant_status_date
  ON public.teacher_attendance(tenant_id, status, marked_at)
  WHERE deleted_at IS NULL;

--------------------------------------------------------------------------
-- Fix 8: Index on checkout_requests(status, created_at) for cleanup jobs
--------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checkout_requests_status_date
  ON public.checkout_requests(status, created_at);

--------------------------------------------------------------------------
-- Fix 9: Add CHECK constraint on notifications.attempts to prevent runaway
--------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_attempts_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_attempts_check
  CHECK (attempts >= 0 AND attempts <= 10);

--------------------------------------------------------------------------
-- Fix 10: ON DELETE CASCADE on invoices → students
--------------------------------------------------------------------------
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_student_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--------------------------------------------------------------------------
-- Fix 11: ON DELETE CASCADE on payments → invoices
--------------------------------------------------------------------------
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

--------------------------------------------------------------------------
-- Fix 12: ON DELETE CASCADE on waivers → invoices
--------------------------------------------------------------------------
ALTER TABLE public.waivers DROP CONSTRAINT IF EXISTS waivers_invoice_id_fkey;
ALTER TABLE public.waivers ADD CONSTRAINT waivers_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

--------------------------------------------------------------------------
-- Fix 13: ON DELETE CASCADE on guardians_link → students
--------------------------------------------------------------------------
ALTER TABLE public.guardians_link DROP CONSTRAINT IF EXISTS guardians_link_student_id_fkey;
ALTER TABLE public.guardians_link ADD CONSTRAINT guardians_link_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--------------------------------------------------------------------------
-- Fix 14: ON DELETE CASCADE on guardians_link → parents
--------------------------------------------------------------------------
ALTER TABLE public.guardians_link DROP CONSTRAINT IF EXISTS guardians_link_parent_id_fkey;
ALTER TABLE public.guardians_link ADD CONSTRAINT guardians_link_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;

--------------------------------------------------------------------------
-- Fix 15: ON DELETE CASCADE on teacher_attendance → teachers
--------------------------------------------------------------------------
ALTER TABLE public.teacher_attendance DROP CONSTRAINT IF EXISTS teacher_attendance_teacher_id_fkey;
ALTER TABLE public.teacher_attendance ADD CONSTRAINT teacher_attendance_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

--------------------------------------------------------------------------
-- Fix 16: ON DELETE CASCADE on checkout_requests → invoices
--------------------------------------------------------------------------
ALTER TABLE public.checkout_requests DROP CONSTRAINT IF EXISTS checkout_requests_invoice_id_fkey;
ALTER TABLE public.checkout_requests ADD CONSTRAINT checkout_requests_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
