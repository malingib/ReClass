-- Missing foreign-key and GIN indexes for query performance.

-- FK indexes on high-traffic tables
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_session_occurrences_session ON public.session_occurrences(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_subject ON public.sessions(subject_id);

-- Columns queried with WHERE filters
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON public.teachers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teachers_profile ON public.teachers(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parents_tenant ON public.parents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON public.subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_types_tenant ON public.fee_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waivers_tenant ON public.waivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waivers_invoice ON public.waivers(invoice_id);
CREATE INDEX IF NOT EXISTS idx_checkout_requests_tenant ON public.checkout_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checkout_requests_invoice ON public.checkout_requests(invoice_id);

-- GIN indexes for jsonb / text[] columns
CREATE INDEX IF NOT EXISTS idx_teachers_subjects ON public.teachers USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_tenants_settings ON public.tenants USING GIN(settings);
