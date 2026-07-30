-- Add ON DELETE CASCADE on tenant FK references to prevent orphan records
-- when a tenant is deleted. Skips tables where the FK was already defined
-- with CASCADE or where the migration would cause ambiguity.

-- Students
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_tenant_id_fkey,
  ADD CONSTRAINT students_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Teachers
ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_tenant_id_fkey,
  ADD CONSTRAINT teachers_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Parents
ALTER TABLE public.parents
  DROP CONSTRAINT IF EXISTS parents_tenant_id_fkey,
  ADD CONSTRAINT parents_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Subjects
ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_tenant_id_fkey,
  ADD CONSTRAINT subjects_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Sessions (classes/timetable)
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_tenant_id_fkey,
  ADD CONSTRAINT sessions_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Fee types
ALTER TABLE public.fee_types
  DROP CONSTRAINT IF EXISTS fee_types_tenant_id_fkey,
  ADD CONSTRAINT fee_types_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Invoices
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey,
  ADD CONSTRAINT invoices_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Guardians link (junction table)
ALTER TABLE public.guardians_link
  DROP CONSTRAINT IF EXISTS guardians_link_tenant_id_fkey,
  ADD CONSTRAINT guardians_link_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Credentials (Mobiwave/Daraja)
ALTER TABLE public.credentials
  DROP CONSTRAINT IF EXISTS credentials_tenant_id_fkey,
  ADD CONSTRAINT credentials_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Other income
ALTER TABLE public.other_income
  DROP CONSTRAINT IF EXISTS other_income_tenant_id_fkey,
  ADD CONSTRAINT other_income_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Expenses
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_tenant_id_fkey,
  ADD CONSTRAINT expenses_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
