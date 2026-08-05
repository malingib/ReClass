-- Distributed rate limiting backed by Postgres (replaces in-memory Map that
-- resets on every serverless cold start and is not shared across instances).
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only the service_role client (which bypasses RLS) touches this table.

-- Atomic hit: increments the bucket, resetting the window if it has elapsed.
-- Returns whether the request is allowed plus remaining budget and reset delay.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_ms integer
)
RETURNS TABLE(allowed boolean, remaining integer, reset_in_ms integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
  v_reset timestamptz;
BEGIN
  INSERT INTO public.rate_limits AS rl (bucket_key, count, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  ON CONFLICT (bucket_key) DO UPDATE SET
    count = CASE WHEN rl.reset_at <= now() THEN 1 ELSE rl.count + 1 END,
    reset_at = CASE WHEN rl.reset_at <= now()
                    THEN now() + make_interval(secs => p_window_ms / 1000.0)
                    ELSE rl.reset_at END
  RETURNING rl.count, rl.reset_at INTO v_count, v_reset;

  RETURN QUERY SELECT
    v_count <= p_max,
    greatest(0, p_max - v_count),
    greatest(0, (extract(epoch FROM (v_reset - now())) * 1000)::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;

-- Opportunistic cleanup of expired buckets (call from an existing cron worker).
CREATE OR REPLACE FUNCTION public.rate_limit_gc()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits WHERE reset_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_gc() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_gc() TO service_role;
