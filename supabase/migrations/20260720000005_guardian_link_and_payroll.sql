--------------------------------------------------------------------------
-- Fix 1: Add tenant_id to guardians_link + compound UNIQUE + backfill
--------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'guardians_link' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.guardians_link
      ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  END IF;
END $$;

-- Backfill from students.tenant_id (both endpoints must belong to same tenant)
UPDATE public.guardians_link g
SET tenant_id = s.tenant_id
FROM public.students s
WHERE g.student_id = s.id
  AND g.tenant_id IS NULL;

-- Tighten: pair + tenant are unique
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_name = 'guardians_link' AND constraint_name = 'guardians_link_student_parent_tenant_key') THEN
    ALTER TABLE public.guardians_link
      ADD CONSTRAINT guardians_link_student_parent_tenant_key UNIQUE (student_id, parent_id, tenant_id);
  END IF;
END $$;

--------------------------------------------------------------------------
-- Fix 2: Prevent cross-tenant parent-student pairs at insert-time
--------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_same_tenant_guardian()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_tenant uuid;
  v_parent_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_student_tenant FROM public.students WHERE id = NEW.student_id;
  SELECT tenant_id INTO v_parent_tenant FROM public.parents WHERE id = NEW.parent_id;

  IF v_student_tenant IS NULL OR v_parent_tenant IS NULL THEN
    RAISE EXCEPTION 'Student % or parent % not found', NEW.student_id, NEW.parent_id;
  END IF;
  IF v_student_tenant != v_parent_tenant THEN
    RAISE EXCEPTION 'Student tenant (%) does not match parent tenant (%)', v_student_tenant, v_parent_tenant;
  END IF;

  NEW.tenant_id := v_student_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_same_tenant_guardian ON public.guardians_link;
CREATE TRIGGER trg_enforce_same_tenant_guardian
  BEFORE INSERT ON public.guardians_link
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_tenant_guardian();

--------------------------------------------------------------------------
-- Fix 3: Add generated tenant_id + compound unique to payroll
--------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payroll_runs_teacher_period_idx') THEN
    CREATE UNIQUE INDEX payroll_runs_teacher_period_idx
      ON public.payroll_runs (tenant_id, teacher_id, period_start, period_end)
      WHERE deleted_at IS NULL;
  END IF;
END $$;

--------------------------------------------------------------------------
-- Fix 4: aggregate_payroll_counts RPC (fixes N+1)
--------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aggregate_payroll_counts(
  p_tenant_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE(teacher_id uuid, occurrences_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT ta.teacher_id, count(*)::bigint
    FROM public.teacher_attendance ta
    JOIN public.session_occurrences so ON ta.occurrence_id = so.id
    WHERE ta.tenant_id = p_tenant_id
      AND ta.approval_status = 'approved'
      AND ta.deleted_at IS NULL
      AND ta.status IN ('present', 'late')
      AND so.occurs_on >= p_period_start
      AND so.occurs_on <= p_period_end
    GROUP BY ta.teacher_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aggregate_payroll_counts(uuid, date, date) TO service_role;

--------------------------------------------------------------------------
-- Fix 5: GDPR helper — reset parents.tenant_id from students side
--------------------------------------------------------------------------
-- (guardians_link.tenant_id already backfilled above)