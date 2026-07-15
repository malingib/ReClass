-- RLS policies for all core tables (must run after core_tables.sql)
-- tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
CREATE POLICY tenant_isolation ON public.tenants
  USING (id = current_setting('app.tenant_id')::uuid);

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_isolation ON public.profiles;
CREATE POLICY profile_isolation ON public.profiles
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_isolation ON public.user_roles;
CREATE POLICY user_roles_isolation ON public.user_roles
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.students;
CREATE POLICY tenant_isolation ON public.students
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
DROP POLICY IF EXISTS student_select_own ON public.students;
-- Teachers can see enrolled students, parents only linked ones (app filters further)
CREATE POLICY student_select_own ON public.students FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- parents
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_isolation ON public.parents;
CREATE POLICY parent_isolation ON public.parents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- guardians_link
ALTER TABLE public.guardians_link ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guardian_isolation ON public.guardians_link;
CREATE POLICY guardian_isolation ON public.guardians_link
  USING (student_id IN (SELECT id FROM public.students WHERE tenant_id = current_setting('app.tenant_id')::uuid));

-- teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_isolation ON public.teachers;
CREATE POLICY teacher_isolation ON public.teachers
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subject_isolation ON public.subjects;
CREATE POLICY subject_isolation ON public.subjects
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- remedial_groups
ALTER TABLE public.remedial_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_isolation ON public.remedial_groups;
CREATE POLICY group_isolation ON public.remedial_groups
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_isolation ON public.sessions;
CREATE POLICY session_isolation ON public.sessions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- session_occurrences
ALTER TABLE public.session_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS occurrence_isolation ON public.session_occurrences;
CREATE POLICY occurrence_isolation ON public.session_occurrences
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_isolation ON public.attendance;
CREATE POLICY attendance_isolation ON public.attendance
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- fee_types
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feetype_isolation ON public.fee_types;
CREATE POLICY feetype_isolation ON public.fee_types
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_isolation ON public.invoices;
CREATE POLICY invoice_isolation ON public.invoices
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_isolation ON public.payments;
CREATE POLICY payment_isolation ON public.payments
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- waivers
ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS waiver_isolation ON public.waivers;
CREATE POLICY waiver_isolation ON public.waivers
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_isolation ON public.notifications;
CREATE POLICY notification_isolation ON public.notifications
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- checkout_requests
ALTER TABLE public.checkout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS checkout_isolation ON public.checkout_requests;
CREATE POLICY checkout_isolation ON public.checkout_requests
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_isolation ON public.audit_log;
CREATE POLICY audit_isolation ON public.audit_log
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
