-- Ensure sessions has created_at / updated_at before the trigger
-- in 20260713000005 attaches touch_updated_at (which would fail if
-- the columns are missing).  This is idempotent.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sessions' AND column_name = 'created_at') THEN
    ALTER TABLE public.sessions ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.sessions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;