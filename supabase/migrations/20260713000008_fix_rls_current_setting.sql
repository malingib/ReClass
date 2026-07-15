-- Fix user_roles RLS: use missing_ok=true so current_setting doesn't error
-- when app.tenant_id is not set (e.g., during login flow)
DROP POLICY IF EXISTS user_roles_isolation ON public.user_roles;
CREATE POLICY user_roles_isolation ON public.user_roles
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Fix ALL tenant-isolation policies to use missing_ok=true
-- Otherwise any client-side query before app.tenant_id is set errors out

-- tenants
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
CREATE POLICY tenant_isolation ON public.tenants
  USING (id = current_setting('app.tenant_id', true)::uuid);

-- profiles
DROP POLICY IF EXISTS profile_isolation ON public.profiles;
CREATE POLICY profile_isolation ON public.profiles
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- students
DROP POLICY IF EXISTS tenant_isolation ON public.students;
DROP POLICY IF EXISTS student_select_own ON public.students;
CREATE POLICY tenant_isolation ON public.students
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY student_select_own ON public.students FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- parents
DROP POLICY IF EXISTS parent_isolation ON public.parents;
CREATE POLICY parent_isolation ON public.parents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- guardians_link
DROP POLICY IF EXISTS guardian_isolation ON public.guardians_link;
CREATE POLICY guardian_isolation ON public.guardians_link
  USING (student_id IN (SELECT id FROM public.students WHERE tenant_id = current_setting('app.tenant_id', true)::uuid));

-- teachers
DROP POLICY IF EXISTS teacher_isolation ON public.teachers;
CREATE POLICY teacher_isolation ON public.teachers
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- subjects
DROP POLICY IF EXISTS subject_isolation ON public.subjects;
CREATE POLICY subject_isolation ON public.subjects
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- remedial_groups
DROP POLICY IF EXISTS group_isolation ON public.remedial_groups;
CREATE POLICY group_isolation ON public.remedial_groups
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- sessions
DROP POLICY IF EXISTS session_isolation ON public.sessions;
CREATE POLICY session_isolation ON public.sessions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- session_occurrences
DROP POLICY IF EXISTS occurrence_isolation ON public.session_occurrences;
CREATE POLICY occurrence_isolation ON public.session_occurrences
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- attendance
DROP POLICY IF EXISTS attendance_isolation ON public.attendance;
CREATE POLICY attendance_isolation ON public.attendance
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- fee_types
DROP POLICY IF EXISTS feetype_isolation ON public.fee_types;
CREATE POLICY feetype_isolation ON public.fee_types
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- invoices
DROP POLICY IF EXISTS invoice_isolation ON public.invoices;
CREATE POLICY invoice_isolation ON public.invoices
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- payments
DROP POLICY IF EXISTS payment_isolation ON public.payments;
CREATE POLICY payment_isolation ON public.payments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- waivers
DROP POLICY IF EXISTS waiver_isolation ON public.waivers;
CREATE POLICY waiver_isolation ON public.waivers
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- notifications
DROP POLICY IF EXISTS notification_isolation ON public.notifications;
CREATE POLICY notification_isolation ON public.notifications
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- checkout_requests
DROP POLICY IF EXISTS checkout_isolation ON public.checkout_requests;
CREATE POLICY checkout_isolation ON public.checkout_requests
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- audit_log
DROP POLICY IF EXISTS audit_isolation ON public.audit_log;
CREATE POLICY audit_isolation ON public.audit_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
