# ReClass — Database Design

**Status:** Pre-development · **DB:** PostgreSQL 15+ · **Tenant model:** shared schema, `school_id` row-level isolation via RLS
**Conventions:** snake_case tables/columns; PK `id` uuid default `gen_random_uuid()`; all tables have audit columns; soft-delete via `deleted_at`; 3NF; UTC stored, EAT displayed.

---

## 1. ER Diagram (logical)

```
tenants 1──* users (auth.users via profiles) 1──* user_roles
tenants 1──* students 1──* guardians_link *──1 parents
tenants 1──* teachers
tenants 1──* subjects
tenants 1──* sessions 1──* session_occurrences 1──* teacher_attendance
tenants 1──* fee_types 1──* invoices 1──* invoice_lines
invoices 1──* payments
invoices 1──* waivers
students 1──* invoices
tenants 1──* notifications
tenants 1──* audit_log
tenants 1──* credentials          -- per-tenant Daraja + Mobiwave secrets (encrypted)
(platform) 1──* credentials       -- scope='platform', purpose='platform_billing' (Mobiwave's OWN account, billing/ops only)
```

## 2. Core Tables (DDL excerpts)

### tenants
```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  brand_primary text DEFAULT '#4f46e5',
  mpesa_shortcode text,
  mpesa_paybill text,
  mpesa_passkey_secret_ref text,       -- vault key, not the secret
  sms_sender_id text,
  currency text DEFAULT 'KES',
  academic_year text,
  timezone text DEFAULT 'Africa/Nairobi',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

### profiles (extends auth.users)
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  full_name text NOT NULL,
  phone text,
  locale text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

### user_roles
```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  role text NOT NULL CHECK (role IN ('super_admin','school_admin','principal','teacher','bursar','parent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id,user_id,role)
);
```

### students
```sql
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  admission_no text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  grade text,                       -- e.g. Form 2
  photo_url text,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, admission_no)
);
```

### parents / guardians_link
```sql
CREATE TABLE parents (
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
CREATE TABLE guardians_link (
  student_id uuid NOT NULL REFERENCES students(id),
  parent_id uuid NOT NULL REFERENCES parents(id),
  relationship text,
  is_primary boolean DEFAULT false,
  PRIMARY KEY (student_id, parent_id)
);
```

### teachers
```sql
CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  profile_id uuid REFERENCES profiles(id),
  first_name text NOT NULL, last_name text NOT NULL,
  employee_no text,
  subjects text[],                    -- FK-less array of subject ids convenience
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

### subjects / remedial_groups
```sql
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  code text,
  deleted_at timestamptz
);
CREATE TABLE remedial_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,                -- e.g. "Form 2 Math Boost"
  subject_id uuid REFERENCES subjects(id),
  teacher_id uuid REFERENCES teachers(id),
  room text,
  capacity int DEFAULT 40,
  term text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

### sessions / session_occurrences
```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  class text,                          -- whole-class identifier (e.g. "Form 2 Math")
  subject_id uuid REFERENCES subjects(id),
  teacher_id uuid REFERENCES teachers(id),
  room text,
  slot text,                           -- e.g. "morning", "afternoon"
  day_of_week int CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  recurrence jsonb,                    -- RRULE-ish or {term, weeks[]}
  active boolean DEFAULT true,
  deleted_at timestamptz
);
CREATE TABLE session_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL REFERENCES sessions(id),
  occurs_on date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  class text,                          -- copied from session at generation
  teacher_id uuid REFERENCES teachers(id),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','done')),
  UNIQUE (session_id, occurs_on)
);
```

### teacher_attendance
```sql
CREATE TABLE teacher_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  occurrence_id uuid NOT NULL REFERENCES session_occurrences(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  status text NOT NULL CHECK (status IN ('present','late')),
  marked_by uuid REFERENCES profiles(id),
  marked_at timestamptz DEFAULT now(),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_note text,
  deleted_at timestamptz,
  UNIQUE (occurrence_id, teacher_id)
);
```

### fee_types / invoices / invoice_lines / payments / waivers
```sql
CREATE TABLE fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,                -- "Term 1 Remedial"
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  term text,
  deleted_at timestamptz
);
CREATE TABLE invoices (
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
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(10,2) NOT NULL,
  method text DEFAULT 'mpesa',
  mpesa_checkout_id text UNIQUE,     -- idempotency key
  mpesa_receipt text,
  phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','reversed')),
  created_at timestamptz DEFAULT now(),
  reconciled_at timestamptz
);
CREATE TABLE waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(10,2) NOT NULL,
  reason text NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### credentials (per-tenant & platform secret store — ENCRYPTED)
```sql
CREATE TABLE credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),          -- NULL when purpose='platform_billing'
  scope text NOT NULL CHECK (scope IN ('tenant','platform')),
  purpose text NOT NULL CHECK (purpose IN ('school_send','platform_billing')),
  provider text NOT NULL CHECK (provider IN ('mpesa','mobiwave_sms')),
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  label text NOT NULL,                            -- e.g. "Malingi Production Daraja"
  encrypted_blob text NOT NULL,                   -- AES-256-GCM JSON: {consumer_key,consumer_secret,passkey,shortcode} / {api_token}
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  last_tested_at timestamptz,
  test_status text CHECK (test_status IN ('untested','ok','failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, provider, environment, scope)  -- tenant rows: per school+provider+env
);
-- purpose='school_send'   -> scope='tenant': a SCHOOL's own credentials used to send ITS messages/charges.
-- purpose='platform_billing' -> scope='platform': Mobiwave's OWN account used for platform billing/
--   operations (e.g. billing tenants, platform-initiated notices). It is NEVER used to send on a
--   school's behalf. Schools without their own 'school_send' creds CANNOT send (or must be on a
--   platform-managed paid plan) — there is no transparent fallback to the owner's paybill.
-- encrypted_blob sealed with a KEK in Supabase Vault; app role cannot read plaintext without KEK fn.
-- purpose='platform_billing' rows visible only to super_admin (RLS).
```

### notifications / audit_log
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  channel text CHECK (channel IN ('sms','email','inapp')),
  recipient text,
  template text,
  body text,
  status text DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','optout')),
  attempt int DEFAULT 0,
  related_type text, related_id uuid,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);
CREATE TABLE audit_log (
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
```

## 3. Indexes (representative)
```
CREATE INDEX idx_students_tenant ON students(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_occ ON attendance(occurrence_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_invoices_student ON invoices(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_checkout ON payments(mpesa_checkout_id);
CREATE INDEX idx_audit_tenant_time ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status='queued';
CREATE INDEX idx_credentials_tenant ON credentials(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_credentials_platform ON credentials(scope) WHERE scope='platform';
```

## 4. Constraints & Integrity
- All FKs enforced; tenant-scoped FKs reference `tenants(id)`.
- `CHECK` constraints on enums (status/role/channel).
- `UNIQUE` on tenant-scoped business keys (admission_no, mpesa_checkout_id, session occurrence).
- Application-level: payment ≤ invoice balance (DB trigger as backstop).

## 5. Normalization
3NF: no derived columns stored except `amount_paid` (kept for hot reporting, maintained by trigger on payment insert). No repeating groups (arrays limited to convenience `teacher.subjects`).

## 6. Data Lifecycle & Retention
- Soft-delete (`deleted_at`) on all domain tables; queries filter `deleted_at IS NULL`.
- Hard purge job (annual): anonymize student/parent PII after 7 years or on tenant offboard (Data Protection Act).
- Backups: PITR daily; cold export weekly; 35-day retention; annual archive to object storage.
- Audit log: append-only, 7-year retention (legal/accountability).

## 7. Row Level Security (RLS)
```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON students
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```
All tables get a `tenant_isolation` policy; session `app.tenant_id` is set per request from the JWT claim. Cross-tenant access is structurally impossible.

### credentials (special RLS)
```sql
-- tenant-scoped creds: only that tenant's admins
CREATE POLICY cred_tenant ON credentials
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
-- platform-scoped creds (purpose='platform_billing'): super_admin only
CREATE POLICY cred_platform ON credentials
  USING (scope = 'platform' AND current_setting('app.role') = 'super_admin')
  WITH CHECK (scope = 'platform' AND current_setting('app.role') = 'super_admin');
```
The app never SELECTs `encrypted_blob` to the client; a server-side `decrypt_credential(id)` SECURITY DEFINER function (using the Vault KEK) returns plaintext only inside Edge Functions, never to the browser.

## 8. Trigger: maintain amount_paid & status
On payment insert (status=paid): add amount to invoice.amount_paid; recompute status (paid/partial/overpaid). On waiver: subtract from amount_due effectively.

## 9. Seeding (Malingi)
Seed tenant `malingi-high`, admin user, sample subjects (Math, English, Kiswahili, Sciences), and a Term-1 remedial fee type. Migration scripts under `supabase/migrations/`.
