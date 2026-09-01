-- ReClass Migration 20260901170000 — payroll domain integrity
-- School payroll and ReClass remedial payroll share payroll_runs but are
-- different financial workflows. Their uniqueness boundary must include domain.

-- The application upsert identity is:
-- tenant_id + teacher_id + period_start + period_end + domain
-- Add the domain column for installations created from the earlier schema.
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'remedial'
  CHECK (domain IN ('school','remedial'));

-- Remove duplicate rows before enforcing the new identity. Keep the newest
-- row for each domain/teacher/period combination; historical rows outside the
-- duplicate set are untouched.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id, teacher_id, period_start, period_end, domain
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.payroll_runs
  WHERE deleted_at IS NULL
)
UPDATE public.payroll_runs p
SET deleted_at = now(), updated_at = now()
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_tenant_teacher_period_domain
  ON public.payroll_runs (tenant_id, teacher_id, period_start, period_end, domain)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_domain_period
  ON public.payroll_runs (tenant_id, domain, period_start, period_end)
  WHERE deleted_at IS NULL;
