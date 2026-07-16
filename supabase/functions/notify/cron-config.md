# Notify Edge Function — Cron Trigger

The `notify` function polls `notifications` table for queued SMS records
and sends them via Mobiwave. It needs to run periodically.

## Option 1 — Supabase pg_cron (recommended)

Run once via Supabase SQL editor:

```sql
SELECT cron.schedule(
  'reclass-sms-notify',
  '*/2 * * * *',   -- every 2 minutes
  $$SELECT net.http_post(
    url => (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_function_url' LIMIT 1),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)),
    body := '{}'
  ) AS request_id;$$
);
```

Requirements:
- `pg_cron` extension enabled (`CREATE EXTENSION IF NOT EXISTS pg_cron;`)
- `pg_net` extension enabled (`CREATE EXTENSION IF NOT EXISTS pg_net;`)
- Store the function URL in Vault: `SELECT vault.create_secret('https://<project>.supabase.co/functions/v1/notify', 'notify_function_url');`
- A service role key in Vault: `SELECT vault.create_secret('<service-role-key>', 'service_role_key');`

## Option 2 — External cron (e.g. cron-job.org)

Ping this URL on a schedule (every 1–2 minutes):

```
https://<project>.supabase.co/functions/v1/notify
```

Pass `Authorization: Bearer <anon-or-service-role-key>` header.
No body required (defaults to `{"limit": 100}`).
