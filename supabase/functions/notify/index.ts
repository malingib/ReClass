import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const MAX_ATTEMPTS = 3;
const MOBIWAVE_BASE = Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const limit = req.method === 'POST' ? (await req.json().catch(() => ({ limit: 100 }))).limit ?? 100 : 100;

  const { data: batch } = await supabase
    .from('notifications').select('id, tenant_id, channel, recipient, body, attempts')
    .eq('status', 'queued').lt('attempts', MAX_ATTEMPTS).limit(limit);
  if (!batch?.length) return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });

  let sent = 0, failed = 0;
  const now = new Date().toISOString();
  for (const n of batch) {
    if (n.channel !== 'sms') continue;
    const { data: credId } = await supabase.rpc('resolve_credential',
      { p_tenant: n.tenant_id, p_provider: 'mobiwave_sms', p_allow_sandbox: false });
    if (!credId) {
      await supabase.from('notifications').update(
        { status: 'failed', last_error: 'CREDS_NOT_FOUND', attempts: n.attempts + 1 }).eq('id', n.id);
      failed++; continue;
    }
    const { data: s } = await supabase.rpc('decrypt_credential', { p_id: credId });
    try {
      const r = await fetch(`${MOBIWAVE_BASE}/sms/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${s.api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: 'RECLASS', type: 'plain', mobile: n.recipient, service_id: 0, message: n.body }),
      }).then(r => r.json());
      if (r?.code === 1) {
        await supabase.from('notifications').update(
          { status: 'sent', external_id: r.data?.[0]?.message_id, attempts: n.attempts + 1, sent_at: now }).eq('id', n.id);
        sent++;
      } else {
        throw new Error(r?.message ?? 'mobiwave_error');
      }
    } catch (e) {
      const attempts = n.attempts + 1;
      await supabase.from('notifications').update({
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
        last_error: String(e), attempts, next_retry_at: backoff(attempts)
      }).eq('id', n.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ processed: batch.length, sent, failed }), { headers: corsHeaders });
});

function backoff(a: number): string {
  return new Date(Date.now() + [1, 5, 30][Math.min(a - 1, 2)] * 60_000).toISOString();
}
