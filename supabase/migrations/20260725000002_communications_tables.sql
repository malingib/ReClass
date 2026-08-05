-- Communications: Announcements
CREATE TABLE IF NOT EXISTS public.comm_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  title text NOT NULL,
  body text NOT NULL,
  audience text DEFAULT 'all' CHECK (audience IN ('all','teachers','parents','students','staff')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Communications: Message Templates
CREATE TABLE IF NOT EXISTS public.comm_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  channel text CHECK (channel IN ('sms','email','both')),
  subject text,
  body text NOT NULL,
  variables text[],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, name)
);

ALTER TABLE public.comm_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.comm_announcements
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON public.comm_templates
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS idx_comm_announcements_tenant ON public.comm_announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_announcements_status ON public.comm_announcements(status);
CREATE INDEX IF NOT EXISTS idx_comm_templates_tenant ON public.comm_templates(tenant_id);

CREATE OR REPLACE FUNCTION public.set_comm_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comm_announcements_updated_at BEFORE UPDATE ON public.comm_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_comm_updated_at();
CREATE TRIGGER trg_comm_templates_updated_at BEFORE UPDATE ON public.comm_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_comm_updated_at();
