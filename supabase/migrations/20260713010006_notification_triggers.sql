-- ReClass Migration — Notification triggers for key events
-- Automatically enqueues notifications when attendance is marked or invoices are created

-- 1. Add last_reminded_at column on invoices for payment reminder logic
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;

-- 2. Trigger: notify on teacher_attendance INSERT
CREATE OR REPLACE FUNCTION public.notify_attendance_marked()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (tenant_id, channel, body, status, related_type, related_id, created_at)
  VALUES (
    NEW.tenant_id,
    'inapp',
    CASE
      WHEN NEW.status = 'absent' THEN 'A teacher was marked absent for a remedial session.'
      WHEN NEW.status = 'late' THEN 'A teacher was marked late for a remedial session.'
      ELSE 'Teacher attendance marked as ' || NEW.status || '.'
    END,
    'queued',
    'teacher_attendance',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_attendance ON public.teacher_attendance;
CREATE TRIGGER trg_notify_attendance
  AFTER INSERT ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_marked();

-- 3. Trigger: notify on invoices INSERT
CREATE OR REPLACE FUNCTION public.notify_invoice_created()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (tenant_id, channel, body, status, related_type, related_id, created_at)
  VALUES (
    NEW.tenant_id,
    'inapp',
    'Invoice of KES ' || NEW.amount_due || ' created.',
    'queued',
    'invoice',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_invoice ON public.invoices;
CREATE TRIGGER trg_notify_invoice
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_created();
