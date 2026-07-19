import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: corsHeaders });

    const { invoice_id } = await req.json();
    if (typeof invoice_id !== 'string') return new Response(JSON.stringify({ error: 'INVALID_INVOICE' }), { status: 400, headers: corsHeaders });

    const { data: parent } = await supabase.from('parents')
      .select('id, tenant_id, phone')
      .eq('profile_id', user.id)
      .maybeSingle();
    if (!parent) return new Response(JSON.stringify({ error: 'PARENT_NOT_LINKED' }), { status: 403, headers: corsHeaders });

    const { data: invoice } = await supabase.from('invoices')
      .select('id, tenant_id, student_id, amount_due, amount_paid, status')
      .eq('id', invoice_id)
      .eq('tenant_id', parent.tenant_id)
      .in('status', ['unpaid', 'partial'])
      .maybeSingle();
    if (!invoice) return new Response(JSON.stringify({ error: 'INVOICE_NOT_FOUND' }), { status: 404, headers: corsHeaders });

    const { data: link } = await supabase.from('guardians_link')
      .select('student_id')
      .eq('parent_id', parent.id)
      .eq('student_id', invoice.student_id)
      .maybeSingle();
    if (!link) return new Response(JSON.stringify({ error: 'INVOICE_NOT_OWNED' }), { status: 403, headers: corsHeaders });

    const tenant_id = parent.tenant_id;
    const phone = parent.phone.replace(/\s/g, '');
    const amount = Number(invoice.amount_due) - Number(invoice.amount_paid ?? 0);
    if (amount <= 0 || !/^254[17]\d{8}$/.test(phone)) {
      return new Response(JSON.stringify({ error: 'INVALID_PAYMENT_DETAILS' }), { status: 400, headers: corsHeaders });
    }
    const { data: cred_id } = await supabase.rpc('resolve_credential',
      { p_tenant: tenant_id, p_provider: 'mpesa', p_allow_sandbox: false });
    if (!cred_id) return new Response(JSON.stringify({ error: 'CREDS_NOT_FOUND' }), { status: 400, headers: corsHeaders });

    const { data: secrets } = await supabase.rpc('decrypt_credential', { p_id: cred_id });
    const base = secrets.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    const auth = btoa(`${secrets.consumer_key}:${secrets.consumer_secret}`);
    const { access_token } = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }).then(r => r.json());

    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const pwd = Buffer.from(`${secrets.passkey}${secrets.shortcode}${ts}`).toString('base64');
    const callback = `${Deno.env.get('PUBLIC_URL')}/functions/v1/mpesa-callback`;

    const stk = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: secrets.shortcode, Password: pwd, Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline', Amount: amount,
        PartyA: phone, PartyB: secrets.shortcode, PhoneNumber: phone,
        CallBackURL: callback, AccountReference: `INV-${invoice_id.slice(0, 8)}`,
        TransactionDesc: 'ReClass fee payment',
      }),
    }).then(r => r.json());

    if (stk.ResponseCode === '0') {
      await supabase.from('checkout_requests').insert({
        tenant_id, invoice_id, checkout_id: stk.CheckoutRequestID,
        amount, phone, status: 'pending'
      });
    }
    return new Response(JSON.stringify(stk), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
