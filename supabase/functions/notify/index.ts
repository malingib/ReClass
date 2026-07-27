import { getServiceClient } from '../_shared/supabase.ts';
import { json, handleOptions, unauthorized } from '../_shared/response.ts';

const supabase = getServiceClient();
const MAX_ATTEMPTS = 3;
const MOBIWAVE_BASE = Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3';
const EXPECTED_TOKEN = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_BATCH = 50;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== EXPECTED_TOKEN) {
    return unauthorized(req);
  }

  // Atomic claim: mark rows as 'processing' to prevent duplicate delivery
  const limit = Math.min(MAX_BATCH, 100);
  const { data: batch } = await supabase
    .from('notifications')
    .update({ status: 'processing' })
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .limit(limit)
    .select('id, tenant_id, channel, recipient, body, attempts');

  if (!batch?.length) return json({ processed: 0 }, 200, req);

  const senderCache = new Map<string, string>();
  let sent = 0, failed = 0;
  const now = new Date().toISOString();
  for (const n of batch) {
    if (n.channel !== 'sms') {
      await supabase.from('notifications').update({ status: 'failed', last_error: 'unsupported_channel' }).eq('id', n.id);
      failed++; continue;
    }

    let senderId = senderCache.get(n.tenant_id);
    if (!senderId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('sms_sender_id')
        .eq('id', n.tenant_id)
        .maybeSingle();
      senderId = tenant?.sms_sender_id || 'RECLASS';
      senderCache.set(n.tenant_id, senderId);
    }

    const { data: credId } = await supabase.rpc('resolve_credential',
      { p_tenant: n.tenant_id, p_provider: 'mobiwave_sms', p_allow_sandbox: false });
    if (!credId) {
      await supabase.from('notifications').update(
        { status: 'failed', last_error: 'CREDS_NOT_FOUND', attempts: n.attempts + 1 }).eq('id', n.id);
      failed++; continue;
    }

    const { data: s } = await supabase.rpc('decrypt_credential', { p_id: credId });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const r = await fetch(`${MOBIWAVE_BASE}/sms/send`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${s.api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId, type: 'plain', mobile: n.recipient, service_id: 0, message: n.body }),
      }).then(r => r.json());
      clearTimeout(timeout);

      if (r?.code === 1) {
        await supabase.from('notifications').update(
          { status: 'sent', external_id: r.data?.[0]?.message_id, attempts: n.attempts + 1, sent_at: now }).eq('id', n.id);
        sent++;
      } else {
        throw new Error(r?.message ?? 'mobiwave_error');
      }
    } catch (e) {
      const attempts = n.attempts + 1;
      const msg = String(e).replace(/([Bb]earer\s+)\S+/g, '$1***').replace(/api[_\-]?token[=:]\s*\S+/gi, 'api_token=***');
      await supabase.from('notifications').update({
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
        last_error: msg, attempts, next_retry_at: backoff(attempts),
      }).eq('id', n.id);
      failed++;
    }
  }

  return json({ processed: batch.length, sent, failed }, 200, req);
});

function backoff(a: number): string {
  return new Date(Date.now() + [1, 5, 30][Math.min(a - 1, 2)] * 60_000).toISOString();
}
