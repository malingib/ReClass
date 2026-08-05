-- Retention policy for unbounded tables (audit + notifications).
-- rate_limits already self-cleans inside rate_limit_hit (see 20260726000001).
-- Keeps: audit_log 365 days, notifications 90 days (read) / 180 days (all),
-- sms/notification queue rows in terminal states 90 days.

CREATE OR REPLACE FUNCTION public.purge_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_log
    WHERE created_at < now() - interval '365 days';

  DELETE FROM public.notifications
    WHERE created_at < now() - interval '90 days'
      AND status IN ('sent', 'failed', 'optout');

  DELETE FROM public.notifications
    WHERE created_at < now() - interval '180 days';

  -- Safety: prune stale rate-limit buckets in case the RPC path is idle
  DELETE FROM public.rate_limits
    WHERE reset_at < now() - interval '1 day';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_retention() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_retention() TO service_role;

-- Nightly at 03:10 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_retention_nightly') THEN
      PERFORM cron.schedule('purge_retention_nightly', '10 3 * * *', 'SELECT public.purge_retention()');
    END IF;
  END IF;
END $$;
