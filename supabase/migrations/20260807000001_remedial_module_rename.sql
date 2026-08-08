-- ==========================================================================
-- eShule platform: module id rename reclass → remedial + seed-on-creation
-- ==========================================================================
-- 1. The remedial module's provisioning id is 'remedial' (it was the legacy
--    'reclass'). Only tenant_modules.module_id values change — URL routes
--    (/admin/reclass) and the _remedial server folder are untouched.
-- 2. The default seed is re-issued (idempotent) with the canonical id set so
--    the seed mirror (scripts/check-boundaries.mjs) trusts this file as the
--    live seed statement and every tenant has its rows.
-- 3. New tenants are seeded automatically by an AFTER INSERT trigger — the
--    only fail-open case left in getEnabledModules is a tenant with genuinely
--    zero rows, which this trigger makes unreachable for new tenants.
-- ==========================================================================

-- ── 1. Rename reclass → remedial (1:1 under the UNIQUE(tenant_id, module_id)) ─
UPDATE public.tenant_modules
SET module_id = 'remedial'
WHERE module_id = 'reclass';

-- ── 2. Re-issue the default seed (idempotent) with the canonical ids ────────
-- Kept BEFORE the trigger below so check-boundaries' seed-mirror block
-- extraction (INSERT → ON CONFLICT) matches this statement.
INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
SELECT t.id, m.module_id, true
FROM public.tenants t
CROSS JOIN (
  SELECT unnest(ARRAY[
    'remedial', 'sis', 'finance', 'communications', 'reports'
  ]) AS module_id
) m
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ── 3. Seed-on-creation: every new tenant gets the default modules ──────────
-- SECURITY DEFINER so the insert bypasses tenant_modules RLS (the seed must
-- never depend on the inserting session's tenant context).
CREATE OR REPLACE FUNCTION public.seed_tenant_modules_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT NEW.id, m.module_id, true
  FROM (
    SELECT unnest(ARRAY[
      'remedial', 'sis', 'finance', 'communications', 'reports'
    ]) AS module_id
  ) m
  ON CONFLICT (tenant_id, module_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_seed_modules ON public.tenants;
CREATE TRIGGER trg_tenants_seed_modules
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_tenant_modules_defaults();

-- ── Rollback (manual; scripts/migrate.mjs is forward-only) ────────────────
-- DROP TRIGGER IF EXISTS trg_tenants_seed_modules ON public.tenants;
-- DROP FUNCTION IF EXISTS public.seed_tenant_modules_defaults();
-- UPDATE public.tenant_modules SET module_id = 'reclass' WHERE module_id = 'remedial';
