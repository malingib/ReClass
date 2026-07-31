import { getServiceClient } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { json, badRequest, unauthorized, forbidden, notFound, handleOptions, internalError } from '../_shared/response.ts';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function fetchWithRetry(url: string, opts: RequestInit, attempt = 0): Promise<Response> {
  try {
    return await fetch(url, opts);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const delay = BASE_DELAY_MS * 2 ** attempt;
    console.warn(`[stk] fetch attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (err as Error).message);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, opts, attempt + 1);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    const user = await verifyAuth(req.headers.get('Authorization'));
    if (!user) return unauthorized(req);

    const supabase = getServiceClient();
    const { fee_type_id, student_id } = await req.json();
    if (typeof fee_type_id !== 'string' || typeof student_id !== 'string')
      return badRequest('INVALID_REQUEST', req);

    const { data: parent } = await supabase.from('parents')
      .select('id, tenant_id, phone')
      .eq('profile_id', user.id)
      .maybeSingle();
    if (!parent) return forbidden(req);

    const { data: feeType } = await supabase.from('fee_types')
      .select('id, tenant_id, name, amount, domain')
      .eq('id', fee_type_id)
      .eq('tenant_id', parent.tenant_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!feeType) return notFound('FEE_TYPE_NOT_FOUND', req);

    const { data: link } = await supabase.from('guardians_link')
      .select('student_id')
      .eq('parent_id', parent.id)
      .eq('student_id', student_id)
      .maybeSingle();
    if (!link) return forbidden(req);

    const { count: pendingCount } = await supabase
      .from('checkout_requests')
      .select('*', { count: 'exact', head: true })
      .eq('fee_type_id', fee_type_id)
      .eq('student_id', student_id)
      .eq('status', 'pending');
    if (pendingCount && pendingCount > 0) {
      return json({ error: 'DUPLICATE_REQUEST', message: 'A payment request for this fee is already being processed.' }, 429, req);
    }

    const tenant_id = parent.tenant_id;
    const phone = parent.phone.replace(/[\s\-\(\)\.\+]/g, '');
    const amount = Number(feeType.amount);
    if (amount <= 0 || !/^254[17]\d{8}$/.test(phone)) {
      return badRequest('INVALID_PAYMENT_DETAILS', req);
    }

    const { data: cred_id } = await supabase.rpc('resolve_credential',
      { p_tenant: tenant_id, p_provider: 'mpesa', p_allow_sandbox: false });
    if (!cred_id) return badRequest('CREDS_NOT_FOUND', req);

    const { data: secrets } = await supabase.rpc('decrypt_credential', { p_id: cred_id });
    const base = secrets.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    const auth = btoa(`${secrets.consumer_key}:${secrets.consumer_secret}`);
    const { access_token } = await fetchWithRetry(
      `${base}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } },
    ).then(r => r.json());

    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const pwd = btoa(`${secrets.passkey}${secrets.shortcode}${ts}`);
    const callback = `${Deno.env.get('PUBLIC_URL')}/functions/v1/mpesa-callback`;

    // Pre-insert checkout request BEFORE STK push so a crash after
    // provider acceptance still has local tracking for reconciliation.
    const checkoutId = crypto.randomUUID();
    await supabase.from('checkout_requests').insert({
      tenant_id, fee_type_id, student_id, checkout_id: checkoutId,
      amount, phone, status: 'pending',
    });

    const stk = await fetchWithRetry(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: secrets.shortcode, Password: pwd, Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline', Amount: amount,
        PartyA: phone, PartyB: secrets.shortcode, PhoneNumber: phone,
        CallBackURL: callback, AccountReference: `FEE-${fee_type_id.slice(0, 8)}`,
        TransactionDesc: 'ReClass fee payment',
      }),
    }).then(r => r.json());

    if (stk.ResponseCode !== '0') {
      await supabase.from('checkout_requests')
        .update({ status: 'failed', reason: stk.ResponseDescription ?? 'STK rejected' })
        .eq('checkout_id', checkoutId);
    } else {
      await supabase.from('checkout_requests')
        .update({ checkout_id: stk.CheckoutRequestID })
        .eq('checkout_id', checkoutId);
    }

    return json(stk, 200, req);
  } catch {
    return internalError(req);
  }
});
