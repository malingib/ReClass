-- Phase B4 — domain_events: broker-less cross-module event seam.
-- Domains publish significant facts here; consumers subscribe via pg_cron or
-- realtime. First consumers: notify (existing drain loop) and _dashboard.
-- No change to existing tables. Idempotent: partial unique index dedupes
-- repeated publication of the same fact from the same source id.

CREATE TABLE IF NOT EXISTS domain_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  topic       text NOT NULL CHECK (length(topic) <= 120),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type text NOT NULL DEFAULT '',            -- e.g. 'payment', 'payroll_run'
  source_id   uuid,                                -- originating row id, nullable for synthetic events
  domain      text NOT NULL DEFAULT 'platform' CHECK (domain IN ('sis','finance','remedial','communications','platform')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  consumed_by text[] NOT NULL DEFAULT '{}',        -- modules that have processed this event
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant_occurred
  ON domain_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_topic
  ON domain_events(tenant_id, topic, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_unconsumed
  ON domain_events(tenant_id, occurred_at)
  WHERE consumed_by = '{}';  -- fast "what's pending" scan per tenant

-- RLS: service-role only; no client access. Enable but grant nothing public.
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;