-- Prevent concurrent STK requests for the same student and fee type.
-- The application-side pending-count check remains useful for a friendly
-- response, but this index is the authoritative race-proof guard.
CREATE UNIQUE INDEX IF NOT EXISTS checkout_requests_one_pending_per_student_fee
  ON public.checkout_requests (tenant_id, student_id, fee_type_id)
  WHERE status = 'pending'
    AND student_id IS NOT NULL
    AND fee_type_id IS NOT NULL;
