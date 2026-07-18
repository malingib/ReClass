-- ReClass Migration 20260714000001 — Automated SMS & reminder cron schedules
-- Registers the recurring jobs that drain the notifications queue and generate
-- payment reminders. These MUST live in a migration so they survive `db reset`
-- and are applied on deploy — they were previously only copy-paste steps in
-- supabase/functions/notify/cron-config.md and therefore never actually ran.
--
-- Requires:
--   * pg_cron  (scheduling engine)
--   * pg_net   (lets cron fire an HTTP POST to the Edge Function)
-- Both are pre-installed on Supabase cloud. CREATE EXTENSION IF NOT EXISTS is a
-- safe no-op if already present.
--
-- Vault secrets referenced below must be created ONCE (values are per-project,
-- never hard-coded in a migration):
--   SELECT vault.create_secret('https://<project>.supabase.co/functions/v1/notify', 'notify_function_url');
--   SELECT vault.create_secret('https://<project>.supabase.co/functions/v1/payment-reminders', 'payment_reminders_function_url');
--   SELECT vault.create_secret('<service-role-key>', 'service_role_key');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Drain the notifications queue via the `notify` Edge Function.
--    Runs every 2 minutes, capped at 100 queued rows per run.
SELECT cron.schedule(
  'reclass-sms-notify',
  '*/2 * * * *',
  $$SELECT net.http_post(
    url => (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_function_url' LIMIT 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'
  ) AS request_id;$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclass-sms-notify');

-- 2. Generate payment-reminder SMS for overdue invoices (throttled to once / 3 days
--    per invoice inside the function itself). Runs daily at 08:00 server time.
SELECT cron.schedule(
  'reclass-payment-reminders',
  '0 8 * * *',
  $$SELECT net.http_post(
    url => (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'payment_reminders_function_url' LIMIT 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'
  ) AS request_id;$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclass-payment-reminders');
