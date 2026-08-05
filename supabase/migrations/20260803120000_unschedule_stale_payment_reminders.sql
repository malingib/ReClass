-- Unschedule the stale `reclass-payment-reminders` job. The target edge
-- function was removed in b811bb2; this cron entry attempts a daily POST
-- to /functions/v1/payment-reminders which now 404s. Auditing recent
-- history: only `notifications-processor` (handler: notify fn) and
-- `session-generator` (handler: generate sessions) remain after this.
SELECT cron.unschedule('reclass-payment-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reclass-payment-reminders'
);
