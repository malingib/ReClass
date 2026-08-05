------------------------------------------------------------------------------
-- 20260731000002: add student_id / fee_type_id to checkout_requests.
-- (split from 20260731000001 so it can be pushed after that migration was
-- already applied to the live tenant DB.)
-- Additive + reversible.
------------------------------------------------------------------------------

ALTER TABLE public.checkout_requests ALTER COLUMN invoice_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'checkout_requests' AND column_name = 'student_id') THEN
    ALTER TABLE public.checkout_requests
      ADD COLUMN student_id uuid REFERENCES public.students(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'checkout_requests' AND column_name = 'fee_type_id') THEN
    ALTER TABLE public.checkout_requests
      ADD COLUMN fee_type_id uuid REFERENCES public.fee_types(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkout_requests_student
  ON public.checkout_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_checkout_requests_feetype
  ON public.checkout_requests(fee_type_id);
