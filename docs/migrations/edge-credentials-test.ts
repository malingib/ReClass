// ============================================================================
// ReClass Edge Function (PLANNING SKELETON) — supabase/functions/credentials-test/index.ts
// Implements POST /credentials/:id/test. Validates a stored credential against
// the real provider BEFORE it may be used for live sends.
//   - mpesa:        fetch OAuth token (sandbox STK optional) -> ok/fail
//   - mobiwave_sms: GET /balance -> ok/fail
// Deploy: supabase functions deploy credentials-test
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { credential_id } = await req.json();
    const { data: secrets, error } = await supabase.rpc('decrypt_credential', { p_id: credential_id });
    if (error || !secrets) return new Response(JSON.stringify({ status: 'failed', reason: 'decrypt' }),
      { status: 400, headers: corsHeaders });

    let ok = false, detail = '';
    if (secrets.consumer_key) {
      // Daraja
      const base = secrets.environment === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
      const auth = btoa(`${secrets.consumer_key}:${secrets.consumer_secret}`);
      const r = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } });
      const j = await r.json();
      ok = !!j.access_token; detail = j.access_token ? 'token ok' : j.errorMessage ?? 'no token';
    } else if (secrets.api_token) {
      // Mobiwave
      const base = Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3';
      const r = await fetch(`${base}/balance`, {
        headers: { Authorization: `Bearer ${secrets.api_token}`, Accept: 'application/json' } });
      const j = await r.json();
      ok = j?.code === 1; detail = ok ? `balance ${j.data?.balance}` : (j?.message ?? 'bad token');
    }

    await supabase.from('credentials').update(
      { test_status: ok ? 'ok' : 'failed', last_tested_at: new Date().toISOString() }
    ).eq('id', credential_id);

    return new Response(JSON.stringify({ status: ok ? 'ok' : 'failed', detail }),
      { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'failed', reason: String(e) }),
      { status: 500, headers: corsHeaders });
  }
});
// Activation rule (api.md): a credential may be used for live sends only when
// test_status='ok'. UI blocks "Activate" until a passing test.
