-- ReClass Migration 20260713010003 — tenant settings jsonb
-- Adds a jsonb `settings` column to tenants for SMS toggle preferences
-- (payment notifications, reminders, payment-received SMS, absence SMS) and
-- any other per-school UI settings. Default empty object.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
