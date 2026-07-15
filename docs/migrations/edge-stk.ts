// ============================================================================
// ReClass Edge Function (PLANNING SKELETON) — supabase/functions/stk/index.ts
// Safaricom Daraja STK Push, tenant-scoped. Deploy with:
//   supabase functions deploy stk
// NEVER import the anon key here. Use service_role from Supabase env.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!   // SERVER ONLY
);

// Resolve a tenant's OWN school_send Daraja credentials (strict, no fallback).
async function resolveDaraja(tenantId: string, allowSandbox: boolean) {
  const { data: credId, error } = await supabase.rpc('resolve_credential', {
    p_tenant: tenantId, p_provider: 'mpesa', p_allow_sandbox: allowSandbox,
  });
  if (!credId) {
    return { error: 'CREDS_NOT_FOUND',
      message: 'School has no active Daraja credentials. Configure Integrations → Daraja.' };
  }
  const { data: secrets, error: dErr } = await supabase.rpc('decrypt_credential', { p_id: credId });
  if (dErr || !secrets) throw new Error('decrypt failed');
  return { secrets }; // { consumer_key, consumer_secret, passkey, shortcode }
}

// Daraja OAuth token (cached per cred in a kv/table ideally; simplified here).
async function getDarajaToken(secrets: any, sandbox: boolean) {
  const base = sandbox
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';
  const auth = btoa(`${secrets.consumer_key}:${secrets.consumer_secret}`);
  const r = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const j = await r.json();
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tenant_id, phone, amount, invoice_id } = await req.json();

    const sandbox = amount === 1; // convention: KES 1 = sandbox test
    const { secrets, error } = await resolveDaraja(tenant_id, sandbox);
    if (error) return new Response(JSON.stringify({ error }), { status: 402, headers: corsHeaders });

    const token = await getDarajaToken(secrets, sandbox);
    const base = sandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${secrets.shortcode}${secrets.passkey}${timestamp}`);

    // Idempotency: one pending STK per invoice_id
    const { data: existing } = await supabase
      .from('payments').select('id,status').eq('invoice_id', invoice_id).eq('status','initiated').maybeSingle();
    if (existing) return new Response(JSON.stringify({ status: 'already_initiated', id: existing.id }), { headers: corsHeaders });

    const checkoutReqId = crypto.randomUUID();
    const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: secrets.shortcode,
        Password: password, Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount, PartyA: phone, PartyB: secrets.shortcode,
        PhoneNumber: phone, CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
        AccountReference: `RECLASS-${invoice_id}`, TransactionDesc: 'School fees',
      }),
    });
    const stk = await stkRes.json();

    // Persist pending payment (idempotent key on checkout_request_id later via callback)
    await supabase.from('payments').insert({
      tenant_id, invoice_id, phone, amount, provider: 'mpesa',
      environment: sandbox ? 'sandbox' : 'production',
      status: 'initiated', reference: stk.CheckoutRequestID ?? checkoutReqId,
      raw: stk,
    });

    return new Response(JSON.stringify({ ok: true, checkout_request_id: stk.CheckoutRequestID }),
      { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
