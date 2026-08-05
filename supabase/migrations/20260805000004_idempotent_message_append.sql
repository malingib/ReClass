-- Make message writes atomic, same-tenant, and retry-safe.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS messages_tenant_idempotency_idx
  ON public.messages(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.append_message(
  p_tenant_id uuid,
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid,
  p_body text,
  p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_message_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_conversation_id IS NULL OR p_sender_id IS NULL
     OR p_recipient_id IS NULL OR p_idempotency_key IS NULL
     OR length(trim(coalesce(p_body, ''))) = 0 OR length(p_body) > 5000 THEN
    RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_sender_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_recipient_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'message_participant_not_found' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = p_sender_id AND tenant_id = p_tenant_id
       AND role IN ('parent', 'teacher', 'school_admin')
  ) THEN
    RAISE EXCEPTION 'message_sender_forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.messages (
    tenant_id, conversation_id, sender_id, sender_role, recipient_id, body, idempotency_key
  )
  SELECT p_tenant_id, p_conversation_id, p_sender_id,
         ur.role, p_recipient_id, trim(p_body), p_idempotency_key
    FROM public.user_roles ur
   WHERE ur.user_id = p_sender_id
     AND ur.tenant_id = p_tenant_id
     AND ur.role IN ('parent', 'teacher', 'school_admin')
   ORDER BY CASE ur.role WHEN 'school_admin' THEN 1 WHEN 'teacher' THEN 2 ELSE 3 END
   LIMIT 1
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT id INTO v_message_id
      FROM public.messages
     WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
  END IF;

  RETURN v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.append_message(uuid, uuid, uuid, uuid, text, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_message(uuid, uuid, uuid, uuid, text, uuid)
  TO service_role;
