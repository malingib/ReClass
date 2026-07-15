// ============================================================================
// ReClass Edge Function (PLANNING SKELETON) — supabase/functions/notify/index.ts
// Fans out queued `notifications` rows to Mobiwave SMS (single channel).
// Mobiwave is the ONLY SMS provider. Email (should-have) is a separate path.
// Deploy: supabase functions deploy notify
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!   // SERVER ONLY
);

const MAX_ATTEMPTS = 3;

async function mobiwaveSend(token: string, sender: string, mobile: string, message: string) {
  const base = Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3';
  const res = await fetch(`${base}/sms/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      Accept: 'application/json' },
    body: JSON.stringify({ sender_id: sender, type: 'plain', mobile, service_id: 0, message }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Triggered by event bus (invoke) OR by cron (process pending queue).
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const limit = body.limit ?? 100;

  // Pull pending + not-opted-out + not-exhausted
  const { data: batch, error } = await supabase
    .from('notifications')
    .select('id, tenant_id, channel, recipient, body, attempts')
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)
    .limit(limit);
  if (error) return new Response(JSON.stringify({ error }), { status: 500, headers: corsHeaders });

  let sent = 0, failed = 0;
  for (const n of batch ?? []) {
    if (n.channel !== 'sms') {
      // email/inapp handled by other paths; skip here
      continue;
    }
    // tenant's OWN school_send Mobiwave token (strict, no owner fallback)
    const { data: credId } = await supabase.rpc('resolve_credential',
      { p_tenant: n.tenant_id, p_provider: 'mobiwave_sms', p_allow_sandbox: false });
    if (!credId) {
      await supabase.from('notifications').update(
        { status: 'failed', last_error: 'CREDS_NOT_FOUND', attempts: n.attempts + 1 }
      ).eq('id', n.id);
      failed++; continue;
    }
    const { data: secrets } = await supabase.rpc('decrypt_credential', { p_id: credId });
    const sender = 'RECLASS';
    try {
      const r = await mobiwaveSend(secrets.api_token, sender, n.recipient, n.body);
      if (r?.code === 1) {
        await supabase.from('notifications').update(
          { status: 'sent', external_id: r.data?.[0]?.message_id, attempts: n.attempts + 1,
            sent_at: new Date().toISOString() }).eq('id', n.id);
        sent++;
      } else {
        throw new Error(r?.message ?? 'mobiwave_error');
      }
    } catch (e) {
      const attempts = n.attempts + 1;
      const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'queued';
      await supabase.from('notifications').update(
        { status, last_error: String(e), attempts, next_retry_at: backoff(attempts) }
      ).eq('id', n.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ processed: batch?.length ?? 0, sent, failed }),
    { headers: corsHeaders });
});

function backoff(attempt: number): string {
  const mins = [1, 5, 30][Math.min(attempt - 1, 2)];
  return new Date(Date.now() + mins * 60_000).toISOString();
}
// STOP opt-out: notification.engine skips recipients flagged opted_out in
// parents/students phone table before enqueue. DLQ = status 'failed' surfaced to admin.
