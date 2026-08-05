-- RLS: tenant isolation on all tables.
-- The application uses the service_role key (bypasses RLS), so these policies
-- are defense-in-depth for Edge Functions and direct anon-key access.
-- current_setting('app.tenant_id', true) returns NULL instead of erroring when
-- the setting is absent, so queries via the service client are unaffected.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.tenants
      USING (id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.profiles
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.user_roles
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.students
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parents' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.parents
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.guardians_link ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guardians_link' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.guardians_link
      USING (EXISTS (
        SELECT 1 FROM public.students
        WHERE id = student_id AND tenant_id = current_setting('app.tenant_id', true)::uuid
      ));
  END IF;
END $$;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.teachers
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.subjects
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.sessions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.session_occurrences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_occurrences' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.session_occurrences
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_types' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.fee_types
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.invoices
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.payments
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waivers' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.waivers
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.notifications
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.audit_log
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE public.checkout_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkout_requests' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.checkout_requests
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
