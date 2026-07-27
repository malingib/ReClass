-- ReClass Migration 20260722000004 — Keep Edge Function instances warm
--
-- Prevents cold starts (~500ms-2s) on STK Push, M-Pesa callback, and
-- credentials-test by pinging them every 5 minutes.
--
-- Prerequisites (run ONCE per Supabase project):
--   SELECT vault.create_secret('https://<project>.supabase.co/functions/v1/stk',              'stk_function_url');
--   SELECT vault.create_secret('https://<project>.supabase.co/functions/v1/mpesa-callback',    'mpesa_callback_function_url');
--   SELECT vault.create_secret('https://<project>.supabase.co/functions/v1/credentials-test',  'credentials_test_function_url');

-- stk_push — ping every 5 min
SELECT cron.schedule(
  'keepwarm-stk',
  '*/5 * * * *',
  $$SELECT net.http_get(
    url => (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'stk_function_url' LIMIT 1)
  ) AS request_id;$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keepwarm-stk');

-- mpesa-callback — ping every 5 min
SELECT cron.schedule(
  'keepwarm-mpesa-callback',
  '*/5 * * * *',
  $$SELECT net.http_get(
    url => (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'mpesa_callback_function_url' LIMIT 1)
  ) AS request_id;$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keepwarm-mpesa-callback');

-- credentials-test — ping every 5 min
SELECT cron.schedule(
  'keepwarm-credentials-test',
  '*/5 * * * *',
  $$SELECT net.http_get(
    url => (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'credentials_test_function_url' LIMIT 1)
  ) AS request_id;$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keepwarm-credentials-test');
