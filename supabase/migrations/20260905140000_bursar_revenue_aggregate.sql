-- Keep Bursar dashboard aggregation in PostgreSQL instead of transferring a year's
-- worth of payment rows to the serverless application for summing.
CREATE OR REPLACE FUNCTION public.sum_school_payments_since(
  p_tenant_id uuid,
  p_since timestamptz
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.payments
  WHERE tenant_id = p_tenant_id
    AND domain = 'school'
    AND status = 'paid'
    AND created_at >= p_since;
$$;

GRANT EXECUTE ON FUNCTION public.sum_school_payments_since(uuid, timestamptz) TO authenticated;
