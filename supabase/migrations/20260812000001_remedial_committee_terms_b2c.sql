-- ==========================================================================
-- eShule remedial: committee roles, canonical terms, B2C payout fields (2026-08-12)
-- ==========================================================================
-- 1. terms — canonical per-term model (SIS owns it; parents pay per term).
-- 2. tenants.current_term_id — the active term by which fee obligations compute.
-- 3. teachers.remedial_role — chairman | treasurer | member | none (hats for the
--    remedial committee; a single teacher wears one hat, replaces overloading
--    principal/school_admin).
-- 4. teachers.phone / teachers.id_number — required for Daraja B2C payouts.
-- 5. credentials: mpesa blob gains initiator_name + security_credential for B2C.
-- ==========================================================================

-- ── 1. terms ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.terms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  start_date  DATE,
  end_date    DATE,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_terms_tenant_current
  ON public.terms (tenant_id, is_current) WHERE deleted_at IS NULL;

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.terms
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP TRIGGER IF EXISTS trg_terms_updated ON public.terms;
CREATE TRIGGER trg_terms_updated BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 2. tenants.current_term_id ────────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS current_term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL;

-- ── 3. teachers remedial committee hat ────────────────────────────────────
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS remedial_role TEXT NOT NULL DEFAULT 'none'
    CHECK (remedial_role IN ('chairman', 'treasurer', 'member', 'none'));

CREATE INDEX IF NOT EXISTS idx_teachers_remedial_role
  ON public.teachers (tenant_id, remedial_role)
  WHERE deleted_at IS NULL AND remedial_role <> 'none';

-- ── 4. teachers B2C payout identity ───────────────────────────────────────
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT;

-- ── 5. mpesa credential blob gains B2C fields ─────────────────────────────
-- Store as: {"consumer_key","consumer_secret","passkey","shortcode",
--            "environment","initiator_name","security_credential"}
-- B2C requires InitiatorName (a Daraja-registered initiator credential) and
-- SecurityCredential (base64 RSA-encrypted initiator password, per Safaricom).