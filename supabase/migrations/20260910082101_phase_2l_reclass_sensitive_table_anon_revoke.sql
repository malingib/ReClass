-- Phase 2L: remove anonymous table privileges from sensitive data surfaces.
revoke all on public.payments from anon;
revoke all on public.teacher_attendance from anon;
revoke all on public.unmatched_payments from anon;
