-- ==========================================================================
-- eShule platform: module provisioning + per-domain payroll (2026-08-02)
-- ==========================================================================
-- 1. tenant_modules — super-admin provisions which modules a tenant can use.
-- 2. payroll_runs.domain — school (salary) vs remedial (per-session) payroll.
-- 3. teachers.salary_monthly — B.O.M. teachers paid directly by the school.
-- ==========================================================================

-- ── 1. tenant_modules ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id   TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_enabled
  ON public.tenant_modules (tenant_id, enabled);

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.tenant_modules
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP TRIGGER IF EXISTS trg_tenant_modules_updated ON public.tenant_modules;
CREATE TRIGGER trg_tenant_modules_updated BEFORE UPDATE ON public.tenant_modules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 2. payroll_runs domain split ──────────────────────────────────────────
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS domain        TEXT NOT NULL DEFAULT 'remedial'
    CHECK (domain IN ('school', 'remedial')),
  ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(12, 2);

-- ── 3. teachers salary (B.O.M. direct-pay teachers) ───────────────────────
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS salary_monthly NUMERIC(12, 2);

-- ── 4. Backfill: existing tenants get all current modules enabled ─────────
-- 'platform' is infrastructure (settings/integrations) — not a provisionable
-- module, so it is NOT seeded here and is never filtered out of the nav.
INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
SELECT t.id, m.module_id, true
FROM public.tenants t
CROSS JOIN (
  SELECT unnest(ARRAY[
    'reclass', 'sis', 'finance', 'communications', 'reports'
  ]) AS module_id
) m
ON CONFLICT (tenant_id, module_id) DO NOTHING;
