-- ReClass core tables. Must run before 0001_credentials.
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  brand_primary text DEFAULT '#4f46e5',
  mpesa_shortcode text,
  mpesa_paybill text,
  mpesa_passkey_secret_ref text,
  sms_sender_id text,
  currency text DEFAULT 'KES',
  academic_year text,
  timezone text DEFAULT 'Africa/Nairobi',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  full_name text NOT NULL,
  phone text,
  locale text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  role text NOT NULL CHECK (role IN ('super_admin','school_admin','principal','teacher','bursar','parent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id,user_id,role)
);
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  admission_no text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  grade text,
  photo_url text,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, admission_no)
);
CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  locale text DEFAULT 'en',
  sms_consent boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.guardians_link (
  student_id uuid NOT NULL REFERENCES students(id),
  parent_id uuid NOT NULL REFERENCES parents(id),
  relationship text,
  is_primary boolean DEFAULT false,
  PRIMARY KEY (student_id, parent_id)
);
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  profile_id uuid REFERENCES profiles(id),
  first_name text NOT NULL, last_name text NOT NULL,
  employee_no text,
  subjects text[],
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  code text,
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.remedial_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  teacher_id uuid REFERENCES teachers(id),
  room text,
  capacity int DEFAULT 40,
  term text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  group_id uuid NOT NULL REFERENCES remedial_groups(id),
  day_of_week int CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  recurrence jsonb,
  active boolean DEFAULT true,
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.session_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL REFERENCES sessions(id),
  occurs_on date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','done')),
  UNIQUE (session_id, occurs_on)
);
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  occurrence_id uuid NOT NULL REFERENCES session_occurrences(id),
  student_id uuid NOT NULL REFERENCES students(id),
  status text NOT NULL CHECK (status IN ('present','late','absent','excused')),
  marked_by uuid REFERENCES profiles(id),
  marked_at timestamptz DEFAULT now(),
  locked boolean DEFAULT false,
  edit_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (occurrence_id, student_id)
);
CREATE TABLE IF NOT EXISTS public.fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  term text,
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  student_id uuid NOT NULL REFERENCES students(id),
  fee_type_id uuid REFERENCES fee_types(id),
  amount_due numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','waived','overpaid')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(10,2) NOT NULL,
  method text DEFAULT 'mpesa',
  mpesa_checkout_id text UNIQUE,
  mpesa_receipt text,
  phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','reversed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reconciled_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(10,2) NOT NULL,
  reason text NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  channel text CHECK (channel IN ('sms','email','inapp')),
  recipient text,
  template text,
  body text,
  status text DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','optout')),
  attempts int DEFAULT 0,
  next_retry_at timestamptz,
  external_id text,
  last_error text,
  related_type text, related_id uuid,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz DEFAULT now()
);
-- checkout_requests: tracks STK Push state for idempotency
CREATE TABLE IF NOT EXISTS public.checkout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  invoice_id uuid REFERENCES invoices(id),
  checkout_id text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_tenant ON public.students(tenant_id) WHERE deleted_at IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
    CREATE INDEX IF NOT EXISTS idx_attendance_occ ON public.attendance(occurrence_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_checkout ON public.payments(mpesa_checkout_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status) WHERE status='queued';
CREATE INDEX IF NOT EXISTS idx_checkout_id ON public.checkout_requests(checkout_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON public.audit_log(tenant_id, created_at DESC);
