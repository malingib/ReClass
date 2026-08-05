ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;
