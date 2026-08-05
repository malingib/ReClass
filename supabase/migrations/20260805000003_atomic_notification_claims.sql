-- Make notification delivery safe across concurrent workers and crashes.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'optout'));

CREATE INDEX IF NOT EXISTS idx_notifications_claimable
  ON public.notifications(status, next_retry_at, claimed_at, created_at);

CREATE OR REPLACE FUNCTION public.claim_notifications(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  channel text,
  recipient text,
  body text,
  attempts integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT n.id
      FROM public.notifications n
     WHERE n.attempts < 3
       AND (
         (n.status = 'queued' AND (n.next_retry_at IS NULL OR n.next_retry_at <= now()))
         OR (n.status = 'processing' AND n.claimed_at < now() - interval '5 minutes')
       )
     ORDER BY n.created_at
     FOR UPDATE SKIP LOCKED
     LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
  ), claimed AS (
    UPDATE public.notifications n
       SET status = 'processing', claimed_at = now()
      FROM candidates c
     WHERE n.id = c.id
     RETURNING n.id, n.tenant_id, n.channel, n.recipient, n.body, n.attempts
  )
  SELECT c.id, c.tenant_id, c.channel, c.recipient, c.body, c.attempts
    FROM claimed c;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notifications(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notifications(integer) TO service_role;
