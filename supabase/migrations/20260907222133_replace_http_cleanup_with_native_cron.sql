-- Native Postgres cron for stale checkout cleanup; no HTTP/Vault/service-role scheduler dependency.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE OR REPLACE FUNCTION public.cleanup_stale_checkout_requests() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected_rows integer;
BEGIN
  UPDATE public.checkout_requests SET status='failed', reason='TIMEOUT - Request was pending for too long and was automatically cancelled', updated_at=NOW()
  WHERE status='pending' AND created_at < NOW() - INTERVAL '30 minutes';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_checkout_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_checkout_requests() TO postgres;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='reclass-cleanup-pending-checkouts';
SELECT cron.schedule('cleanup-stale-checkouts','*/5 * * * *','SELECT public.cleanup_stale_checkout_requests();')
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-stale-checkouts');
