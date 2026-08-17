-- Create other_income table for tracking school income beyond parent fees
CREATE TABLE IF NOT EXISTS public.other_income (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category    TEXT NOT NULL DEFAULT 'other',
  received_at DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES public.profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Create expenses table for tracking school operating expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category    TEXT NOT NULL DEFAULT 'other',
  incurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by     UUID REFERENCES public.profiles(id),
  vendor      TEXT,
  receipt_url TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Enable RLS on both tables
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS: tenant-scoped access. Fail closed: when app.tenant_id is unset the
-- comparison is against NULL and the policy denies, never a no-op fallback.
CREATE POLICY tenant_isolation ON public.other_income
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON public.expenses
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Fix nullable tenant_id on credentials
ALTER TABLE public.credentials
  ALTER COLUMN tenant_id SET NOT NULL;

-- Fix nullable tenant_id on guardians_link
ALTER TABLE public.guardians_link
  ALTER COLUMN tenant_id SET NOT NULL;
