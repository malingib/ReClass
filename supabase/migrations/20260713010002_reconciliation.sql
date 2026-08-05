-- Reconciliation + misallocated-payment (wrong-account) handling.
-- Tenant-scoped. Soft-delete via deleted_at.
CREATE TABLE IF NOT EXISTS public.payment_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  payment_id uuid NOT NULL REFERENCES payments(id),
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'matched' CHECK (status IN ('matched','misallocated','resolved')),
  originally_for text,
  original_invoice_id uuid REFERENCES invoices(id),
  excess_amount numeric(10,2) DEFAULT 0,
  reassigned_to_invoice uuid REFERENCES invoices(id),
  note text,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (payment_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_recon_tenant ON public.payment_reconciliations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recon_payment ON public.payment_reconciliations(payment_id);
CREATE INDEX IF NOT EXISTS idx_recon_week ON public.payment_reconciliations(week_start);
CREATE INDEX IF NOT EXISTS idx_recon_status ON public.payment_reconciliations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recon_tenant_week ON public.payment_reconciliations(tenant_id, week_start) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.payment_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recon_isolation ON public.payment_reconciliations;
CREATE POLICY recon_isolation ON public.payment_reconciliations
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- updated_at
DROP TRIGGER IF EXISTS trg_payment_reconciliations_updated ON public.payment_reconciliations;
CREATE TRIGGER trg_payment_reconciliations_updated
  BEFORE UPDATE ON public.payment_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
