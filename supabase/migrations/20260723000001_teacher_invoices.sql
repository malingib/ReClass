CREATE TABLE IF NOT EXISTS public.teacher_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  amount_due numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'unpaid', 'paid', 'cancelled')),
  period_start date,
  period_end date,
  occurrences_count int DEFAULT 0,
  rate_per_session numeric(10,2),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.teacher_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.teacher_invoices
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS idx_teacher_invoices_tenant ON public.teacher_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invoices_teacher ON public.teacher_invoices(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invoices_status ON public.teacher_invoices(status);

-- Trigger to auto-set updated_at
CREATE OR REPLACE FUNCTION public.set_teacher_invoice_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teacher_invoices_updated_at ON public.teacher_invoices;
CREATE TRIGGER trg_teacher_invoices_updated_at
  BEFORE UPDATE ON public.teacher_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_teacher_invoice_updated_at();
