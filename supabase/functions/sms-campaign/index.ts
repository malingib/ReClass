import { getServiceClient } from '../_shared/supabase.ts';
import { json, handleOptions, unauthorized, forbidden, badRequest } from '../_shared/response.ts';
import { verifyAuth } from '../_shared/auth.ts';

const MOBIWAVE_BASE = Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3';
const ALLOWED_ROLES = ['school_admin', 'super_admin', 'principal', 'bursar'];

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/**
 * sms-campaign Edge Function (Mobiwave API v3).
 * - { op: 'balance' } → GET /balance connectivity + units check
 * - { recipients: [...], message, trigger? } → enqueue into notifications queue
 *   (delivery itself is performed by the `notify` worker)
 * - { contact_list_id, message } → POST /sms/campaign bulk send
 * Caller must hold an staff role; tenant is resolved from user_roles.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const user = await verifyAuth(req.headers.get('Authorization'));
  if (!user) return unauthorized(req);

  const supabase = getServiceClient();
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id);
  const held = (roleRows ?? []) as { role: string; tenant_id: string }[];
  const staff = held.filter((r) => ALLOWED_ROLES.includes(r.role));
  if (staff.length === 0) return forbidden(req);
  const tenantId = staff[0].tenant_id;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return badRequest('INVALID_JSON', req);
  }

  const { data: credId } = await supabase.rpc('resolve_credential', {
    p_tenant: tenantId,
    p_provider: 'mobiwave_sms',
    p_allow_sandbox: false,
  });
  if (!credId && body.op !== 'enqueue') return json({ error: 'CREDS_NOT_FOUND' }, 400, req);

  let apiToken = '';
  if (credId) {
    const { data: s } = await supabase.rpc('decrypt_tenant_credential', { p_id: credId, p_tenant: tenantId });
    apiToken = (s as { api_token?: string } | null)?.api_token ?? '';
  }

  if (body.op === 'balance') {
    if (!apiToken) return json({ error: 'CREDS_NOT_FOUND' }, 400, req);
    const r = await fetch(`${MOBIWAVE_BASE}/balance`, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    }).then((r) => r.json()).catch((e) => ({ status: 'error', message: String(e) }));
    return json({ balance: r }, 200, req);
  }

  const { data: tenant } = await supabase.from('tenants').select('sms_sender_id').eq('id', tenantId).maybeSingle();
  const senderId = (tenant as { sms_sender_id?: string } | null)?.sms_sender_id || 'ESHULE';
  const message = String(body.message ?? '');
  if (!message) return badRequest('MESSAGE_REQUIRED', req);

  // Bulk campaign to Mobiwave contact lists
  if (body.contact_list_id) {
    if (!apiToken) return json({ error: 'CREDS_NOT_FOUND' }, 400, req);
    const r = await fetch(`${MOBIWAVE_BASE}/sms/campaign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        contact_list_id: body.contact_list_id,
        sender_id: senderId,
        type: 'plain',
        message,
      }),
    }).then((r) => r.json()).catch((e) => ({ status: 'error', message: String(e) }));
    return json({ campaign: r }, 200, req);
  }

  // Direct recipients → enqueue into notifications queue for the notify worker
  const recipients = ((body.recipients ?? []) as string[]).map(normalizePhone).filter(Boolean);
  if (recipients.length === 0) return badRequest('RECIPIENTS_REQUIRED', req);
  const rows = recipients.map((recipient) => ({
    tenant_id: tenantId,
    channel: 'sms',
    recipient,
    body: message,
    template: String(body.trigger ?? 'manual_custom'),
    status: 'queued',
    attempts: 0,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) return json({ error: 'ENQUEUE_FAILED', detail: error.message }, 500, req);
  return json({ queued: rows.length }, 200, req);
});
