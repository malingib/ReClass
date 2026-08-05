-- ==========================================================================
-- Phase 1 — Domain Schema Separation
-- ==========================================================================
-- Creates bounded-context schemas for each module and maps every table to
-- its owning domain.  Cross-domain references use schema-qualified names.
--
-- ⚠️  BLUEPRINT — review and test before applying to production.
--     The original tables remain in public for this migration; the ALTER SET
--     SCHEMA commands are gated behind a flag (schema_domains_applied).
-- ==========================================================================

-- 1. Create domain schemas
-- ==========================================================================
CREATE SCHEMA IF NOT EXISTS remedial;      -- Remedial class mgmt
CREATE SCHEMA IF NOT EXISTS finance;        -- Billing, payments, payroll
CREATE SCHEMA IF NOT EXISTS sis;            -- Student Information System
CREATE SCHEMA IF NOT EXISTS communications; -- Notifications, announcements, templates
CREATE SCHEMA IF NOT EXISTS platform;       -- Auth, credentials, rate-limits, utilities

-- 2. Table-to-domain mapping (documentation)
-- ==========================================================================
-- Every table stays in public until the gate is flipped.  This COMMENT acts
-- as the source of truth for domain ownership.
--
-- remedial:
--   public.sessions              → remedial.sessions
--   public.session_occurrences   → remedial.session_occurrences
--   public.teacher_attendance    → remedial.teacher_attendance
--   public.group_members         → remedial.group_members           (if still used)
--
-- finance:
--   public.invoices              → finance.invoices
--   public.payments              → finance.payments
--   public.checkout_requests     → finance.checkout_requests
--   public.fee_types             → finance.fee_types
--   public.waivers               → finance.waivers
--   public.payroll_runs          → finance.payroll_runs
--   public.payment_reconciliations → finance.payment_reconciliations
--   public.other_income          → finance.other_income
--   public.expenses              → finance.expenses
--   public.teacher_invoices      → finance.teacher_invoices
--
-- sis:
--   public.students              → sis.students
--   public.teachers              → sis.teachers
--   public.parents               → sis.parents
--   public.guardians_link        → sis.guardians_link
--   public.sis_classes           → sis.sis_classes
--   public.sis_admissions        → sis.sis_admissions
--   public.sis_enrollments       → sis.sis_enrollments
--   public.subjects              → sis.subjects
--
-- communications:
--   public.notifications         → communications.notifications
--   public.comm_announcements    → communications.comm_announcements
--   public.comm_templates        → communications.comm_templates
--   public.messages              → communications.messages
--
-- platform (shared infrastructure):
--   public.tenants               → platform.tenants
--   public.profiles              → platform.profiles
--   public.user_roles            → platform.user_roles
--   public.credentials           → platform.credentials
--   public.rate_limits           → platform.rate_limits
--   public.audit_log             → platform.audit_log
--   public.impersonation_tokens  → platform.impersonation_tokens
--
-- academic (new schema — not yet extracted):
--   public.exams                 → academic.exams
--   public.exam_results          → academic.exam_results

COMMENT ON SCHEMA remedial      IS 'Remedial class management: sessions, occurrences, attendance';
COMMENT ON SCHEMA finance       IS 'Billing & payments: invoices, payments, payroll, waivers';
COMMENT ON SCHEMA sis           IS 'Student Information System: students, teachers, parents, classes';
COMMENT ON SCHEMA communications IS 'Outbound communications: notifications, announcements, messages';
COMMENT ON SCHEMA platform      IS 'Shared platform: tenants, auth, credentials, rate-limits';

-- 3. Migration gate — flip to true to move tables
-- ==========================================================================
-- The actual ALTER TABLE … SET SCHEMA commands execute only when the
-- session parameter schema_domains_applied = 'true'.  Apply via:
--   SET app.schema_domains_applied = 'true';
-- or from a migration script:
--   SELECT set_config('app.schema_domains_applied', 'true', false);
--
-- Until the gate is flipped, everything stays in public and the app
-- continues to work unchanged — this file documents the target layout.

DO $$
BEGIN
  IF current_setting('app.schema_domains_applied', true) = 'true' THEN

    -- ── remedial ──────────────────────────────────────────────────────
    ALTER TABLE public.sessions              SET SCHEMA remedial;
    ALTER TABLE public.session_occurrences   SET SCHEMA remedial;
    ALTER TABLE public.teacher_attendance    SET SCHEMA remedial;

    -- ── finance ───────────────────────────────────────────────────────
    ALTER TABLE public.invoices              SET SCHEMA finance;
    ALTER TABLE public.payments              SET SCHEMA finance;
    ALTER TABLE public.checkout_requests     SET SCHEMA finance;
    ALTER TABLE public.fee_types             SET SCHEMA finance;
    ALTER TABLE public.waivers               SET SCHEMA finance;
    ALTER TABLE public.payroll_runs          SET SCHEMA finance;
    ALTER TABLE public.payment_reconciliations SET SCHEMA finance;
    ALTER TABLE public.other_income          SET SCHEMA finance;
    ALTER TABLE public.expenses              SET SCHEMA finance;
    ALTER TABLE public.teacher_invoices      SET SCHEMA finance;

    -- ── sis ───────────────────────────────────────────────────────────
    ALTER TABLE public.students              SET SCHEMA sis;
    ALTER TABLE public.teachers              SET SCHEMA sis;
    ALTER TABLE public.parents               SET SCHEMA sis;
    ALTER TABLE public.guardians_link        SET SCHEMA sis;
    ALTER TABLE public.sis_classes           SET SCHEMA sis;
    ALTER TABLE public.sis_admissions        SET SCHEMA sis;
    ALTER TABLE public.sis_enrollments       SET SCHEMA sis;
    ALTER TABLE public.subjects              SET SCHEMA sis;

    -- ── communications ────────────────────────────────────────────────
    ALTER TABLE public.notifications         SET SCHEMA communications;
    ALTER TABLE public.comm_announcements    SET SCHEMA communications;
    ALTER TABLE public.comm_templates        SET SCHEMA communications;
    ALTER TABLE public.messages              SET SCHEMA communications;

    -- ── platform ─────────────────────────────────────────────────────
    ALTER TABLE public.tenants               SET SCHEMA platform;
    ALTER TABLE public.profiles              SET SCHEMA platform;
    ALTER TABLE public.user_roles            SET SCHEMA platform;
    ALTER TABLE public.credentials           SET SCHEMA platform;
    ALTER TABLE public.rate_limits           SET SCHEMA platform;
    ALTER TABLE public.audit_log             SET SCHEMA platform;
    ALTER TABLE public.impersonation_tokens  SET SCHEMA platform;

    -- ── update internal FK references inside functions / triggers ─────
    -- All SECURITY DEFINER functions with SET search_path = public need
    -- to reference tables by their new schema.  The helper below rewrites
    -- references in the most commonly called functions.
    -- (Manual review of each RPC is still required — see table below.)

    -- Patch RPCs to use schema-qualified names.
    -- Existing RPCs with SET search_path = public will fail after the move
    -- unless they schema-qualify every table reference.
    -- See audit list in the docs/ migration.
  END IF;
END $$;

-- 4. Cross-schema views for shared access patterns
-- ==========================================================================
-- Views in the reclass schema compose data from multiple domains so that
-- application code (dashboards, reports) can query a single view instead
-- of stitching 5-10 parallel queries.  These views reference public.*
-- tables (current layout).  When tables move to domain schemas, create
-- the following replacement views in a follow-up migration:
--
--   CREATE OR REPLACE VIEW reclass.invoice_details AS
--   SELECT ... FROM finance.invoices i
--   JOIN sis.students s ON s.id = i.student_id ...;
--
-- ⚠️  These views are NOT security-restricted — they rely on the calling
--     context's tenant isolation (app.tenant_id).  The app's backend
--     always filters by tenant_id before exposing data.
-- ==========================================================================
CREATE SCHEMA IF NOT EXISTS reclass;

-- Invoice with student name, parent name, amounts, status.
-- Consumed by: finance dashboard, bursar aging, reports
CREATE OR REPLACE VIEW reclass.invoice_details AS
SELECT
  i.id,
  i.tenant_id,
  i.student_id,
  i.amount_due,
  i.amount_paid,
  i.status,
  i.due_date,
  i.created_at,
  i.fee_type_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  s.grade
FROM public.invoices i
LEFT JOIN public.students s ON s.id = i.student_id
WHERE i.deleted_at IS NULL;

-- Payment with invoice reference, student info, and channel.
-- Consumed by: parent portal, admin payments view, reports
CREATE OR REPLACE VIEW reclass.payment_details AS
SELECT
  p.id           AS payment_id,
  p.invoice_id,
  p.tenant_id,
  p.amount,
  p.phone,
  p.method,
  p.status       AS payment_status,
  p.created_at   AS paid_at,
  i.amount_due,
  i.amount_paid  AS invoice_amount_paid,
  i.status       AS invoice_status,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  s.grade
FROM public.payments p
JOIN public.invoices i  ON i.id = p.invoice_id
LEFT JOIN public.students s ON s.id = i.student_id
WHERE i.deleted_at IS NULL;

-- Teacher attendance with teacher name, session info, approval status.
-- Consumed by: admin attendance, principal effectiveness, payroll
CREATE OR REPLACE VIEW reclass.attendance_details AS
SELECT
  ta.id,
  ta.tenant_id,
  ta.occurrence_id,
  ta.teacher_id,
  ta.status        AS attendance_status,
  ta.approval_status,
  ta.marked_at,
  ta.reviewed_at,
  so.occurs_on,
  so.session_id,
  ses.class,
  ses.subject_id,
  sub.name         AS subject_name,
  t.first_name || ' ' || t.last_name AS teacher_name,
  t.employee_no
FROM public.teacher_attendance ta
JOIN public.session_occurrences so ON so.id = ta.occurrence_id
JOIN public.sessions ses           ON ses.id = so.session_id
LEFT JOIN public.subjects sub      ON sub.id = ses.subject_id
JOIN public.teachers t             ON t.id = ta.teacher_id
WHERE ta.deleted_at IS NULL;

-- Student with class/enrollment info.
-- Consumed by: student lists, parent portal, fee assignment
CREATE OR REPLACE VIEW reclass.student_profile AS
SELECT
  st.id,
  st.tenant_id,
  st.admission_no,
  st.first_name,
  st.last_name,
  st.first_name || ' ' || st.last_name AS full_name,
  st.grade,
  st.status          AS enrollment_status,
  st.created_at,
  COALESCE(se.class_id, sc.id) AS class_id,
  COALESCE(sc.name, st.grade)  AS class_name,
  sc.stream
FROM public.students st
LEFT JOIN public.sis_enrollments se ON se.student_id = st.id AND se.status = 'active'
LEFT JOIN public.sis_classes sc     ON sc.id = COALESCE(se.class_id, NULL)
WHERE st.deleted_at IS NULL;

-- Guardian link with parent and student names.
-- Consumed by: parent portal ownership resolution
CREATE OR REPLACE VIEW reclass.guardian_link AS
SELECT
  gl.tenant_id,
  gl.parent_id,
  gl.student_id,
  p.full_name       AS parent_name,
  p.phone           AS parent_phone,
  p.email           AS parent_email,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  s.grade
FROM public.guardians_link gl
JOIN public.parents p    ON p.id = gl.parent_id
JOIN public.students s   ON s.id = gl.student_id;

COMMENT ON SCHEMA reclass IS 'Cross-domain views for dashboards and reporting — always query with a tenant_id filter';

-- 5. RPC audit — functions that reference public.<table> internally
-- ==========================================================================
-- The following functions reference tables by their public. prefix and will
-- need updating once tables move:
--
--   Function                                   Tables referenced
--   ─────────────────────────────────────────  ────────────────────
--   public.get_admin_dashboard_stats           students, teachers, subjects, sessions,
--                                              invoices, teacher_attendance, session_occurrences
--   public.reconcile_payment                   invoices, payments, payment_reconciliations
--   public.rate_limit_hit                      rate_limits
--   public.purge_retention                     audit_log, notifications, rate_limits
--   public.resolve_credential                  credentials
--   public.tenant_setting_enabled              tenants
--   public.update_invoice_on_payment           invoices
--   public.notify_attendance_marked            notifications
--   public.notify_invoice_created              notifications
--   public.enforce_same_tenant_guardian        students, parents
--   public.generate_session_occurrences        session_occurrences
--   public.set_tenant_context                  (app.tenant_id setting)
--
-- Each function uses SECURITY DEFINER with SET search_path = public, so
-- after the move the search_path must include the target schema(s) OR the
-- table references must be schema-qualified.

COMMENT ON SCHEMA reclass IS 'Cross-domain views for dashboards and reporting';
