-- Remove tenancy: single-school deployment.
--
-- Decision: eShule runs one school per project, so tenant scoping is pure
-- overhead. The pilot database never had it (no tenants table, no tenant_id
-- columns), which surfaced in the app as 404s on /rest/v1/tenants and dead
-- tenant-gated queries. This migration converges every environment:
--   1. drops tenant_id columns where they exist (FKs go with the columns),
--   2. drops the tenants table,
--   3. creates the missing invoices table WITHOUT tenant scoping,
--   4. creates the school_settings singleton (replaces per-tenant settings),
--   5. redefines review_teacher_attendance without the tenant parameter.
-- Fully idempotent. Does not touch RLS.

-- 1. tenant_id columns go first (drops the FKs that reference tenants).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'user_roles', 'students', 'parents',
    'teachers', 'subjects', 'fee_types', 'invoices',
    'payments', 'waivers', 'notifications', 'unmatched_payments',
    'sis_enrollments', 'sis_admissions', 'teacher_attendance',
    'sessions', 'payroll_runs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN tenant_id', t);
    END IF;
  END LOOP;
END $$;

-- 2. tenants table.
DROP TABLE IF EXISTS public.tenants;

-- 3. invoices table without tenancy (was missing on pilot projects).
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  fee_type_id uuid REFERENCES fee_types(id),
  amount_due numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','waived','overpaid')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 4. school_settings singleton (replaces the tenants row for school profile).
-- Shape matches the live table; extra app columns are added idempotently.
CREATE TABLE IF NOT EXISTS public.school_settings (
  id smallint PRIMARY KEY,
  name text,
  slug text,
  logo_url text,
  currency text DEFAULT 'KES',
  academic_year text DEFAULT '2026',
  timezone text DEFAULT 'Africa/Nairobi',
  sms_sender_id text DEFAULT 'ESHULE',
  mpesa_shortcode text,
  mpesa_paybill text,
  kcb_account_no text,
  school_payment_channel text DEFAULT 'bank',
  remedial_payment_channel text DEFAULT 'mpesa',
  payroll_rate_per_session numeric(10,2),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
DO $$
BEGIN
  IF to_regclass('public.school_settings') IS NOT NULL THEN
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS slug text;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS logo_url text;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2026';
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Nairobi';
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS sms_sender_id text DEFAULT 'ESHULE';
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS mpesa_shortcode text;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS mpesa_paybill text;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS kcb_account_no text;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS school_payment_channel text DEFAULT 'bank';
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS remedial_payment_channel text DEFAULT 'mpesa';
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS payroll_rate_per_session numeric(10,2);
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS updated_by uuid;
    INSERT INTO public.school_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    UPDATE public.school_settings SET
      name = COALESCE(name, 'Malingi High School'),
      slug = COALESCE(slug, 'malingi-high'),
      currency = COALESCE(currency, 'KES'),
      academic_year = COALESCE(academic_year, '2026'),
      timezone = COALESCE(timezone, 'Africa/Nairobi'),
      sms_sender_id = COALESCE(sms_sender_id, 'ESHULE'),
      school_payment_channel = COALESCE(school_payment_channel, 'bank'),
      remedial_payment_channel = COALESCE(remedial_payment_channel, 'mpesa')
    WHERE id = 1;
  END IF;
END $$;

-- 5. review_teacher_attendance without tenancy (app calls this RPC directly).
DROP FUNCTION IF EXISTS public.review_teacher_attendance(uuid, uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION public.review_teacher_attendance(
  p_profile_id uuid,
  p_attendance_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  updated_id uuid;
  is_principal boolean;
  is_chairman boolean;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('status', 'invalid_decision');
  END IF;
  IF p_decision = 'rejected' AND nullif(btrim(p_note), '') IS NULL THEN
    RETURN jsonb_build_object('status', 'note_required');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_profile_id AND role IN ('principal', 'school_admin')
  ) INTO is_principal;

  SELECT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE profile_id = p_profile_id
      AND remedial_role = 'chairman'
      AND deleted_at IS NULL
  ) INTO is_chairman;

  IF NOT (is_principal OR is_chairman) THEN
    RETURN jsonb_build_object('status', 'forbidden');
  END IF;

  UPDATE public.teacher_attendance SET
    approval_status = p_decision,
    reviewed_by = p_profile_id,
    reviewed_at = now(),
    review_note = nullif(btrim(p_note), '')
  WHERE id = p_attendance_id
    AND approval_status = 'pending' AND deleted_at IS NULL
  RETURNING id INTO updated_id;

  RETURN jsonb_build_object(
    'status', CASE WHEN updated_id IS NULL THEN 'not_pending' ELSE p_decision END,
    'attendance_id', updated_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_teacher_attendance(uuid, uuid, text, text)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_teacher_attendance(uuid, uuid, text, text)
  TO authenticated;
