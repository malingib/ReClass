import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { credential_id } = await req.json();
    const { data: s, error } = await supabase.rpc('decrypt_credential', { p_id: credential_id });
    if (error || !s) return new Response(JSON.stringify({ status: 'failed', reason: 'decrypt' }), { status: 400, headers: corsHeaders });

    let ok = false, detail = '';
    if (s.consumer_key) {
      const base = s.environment === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
      const r = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${btoa(`${s.consumer_key}:${s.consumer_secret}`)}` } }).then(r => r.json());
      ok = !!r.access_token; detail = r.access_token ? 'token_ok' : r.errorMessage ?? 'no_token';
    } else if (s.api_token) {
      const r = await fetch(`${Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3'}/balance`,
        { headers: { Authorization: `Bearer ${s.api_token}` } }).then(r => r.json());
      ok = r?.code === 1; detail = ok ? `balance_${r.data?.balance}` : r?.message ?? 'bad_token';
    }
    await supabase.from('credentials').update(
      { test_status: ok ? 'ok' : 'failed', last_tested_at: new Date().toISOString() }).eq('id', credential_id);
    return new Response(JSON.stringify({ status: ok ? 'ok' : 'failed', detail }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'failed', reason: String(e) }), { status: 500, headers: corsHeaders });
  }
});
