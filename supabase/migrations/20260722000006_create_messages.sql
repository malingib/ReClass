CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  sender_role text NOT NULL CHECK (sender_role IN ('parent', 'teacher', 'school_admin')),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(tenant_id, conversation_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages(tenant_id, sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(tenant_id, recipient_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_tenant_isolation ON public.messages
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY messages_participant_access ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY messages_insert_own ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
