import { getServiceClient } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { badRequest, handleOptions, internalError, json, unauthorized } from '../_shared/response.ts';
import { getPlatformConfig } from '../_shared/platform-config.ts';

const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, options: RequestInit, attempt = 0): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    return fetchWithRetry(url, options, attempt + 1);
  }
}

function normalizePhone(value: string): string | null {
  const digits = value.replace(/[\s\-().+]/g, '');
  const normalized = digits.startsWith('0') ? `254${digits.slice(1)}` : digits.startsWith('7') ? `254${digits}` : digits;
  return /^254[17]\d{8}$/.test(normalized) ? normalized : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, req);

  try {
    const user = await verifyAuth(req.headers.get('Authorization'));
    if (!user) return unauthorized(req);

    const body = await req.json();
    const obligationId = typeof body?.obligation_id === 'string' ? body.obligation_id : '';
    const amount = Number(body?.amount);
    const phone = typeof body?.phone === 'string' ? normalizePhone(body.phone) : null;
    if (!obligationId || !Number.isFinite(amount) || amount <= 0 || !phone) {
      return badRequest('INVALID_REQUEST', req);
    }

    const supabase = getServiceClient();
    const { data: initiated, error: initiateError } = await supabase.rpc('initiate_parent_reclass_payment', {
      p_obligation_id: obligationId,
      p_amount: amount,
      p_phone: phone,
    });
    if (initiateError) {
      console.error('[reclass-stk] parent payment initiation failed:', initiateError.message);
      return json({ error: 'PAYMENT_NOT_ALLOWED', message: initiateError.message }, 400, req);
    }

    const transactionId = initiated?.transaction_id;
    const accountReference = initiated?.account_reference;
    if (!transactionId || !accountReference) return internalError(req);

    // Credential resolution/decryption is restricted to the service role. No
    // credential material is returned to the browser or to authenticated RPCs.
    const { data: credentialId, error: credentialError } = await supabase.rpc('resolve_reclass_mpesa_credential', {
      p_allow_sandbox: false,
    });
    if (credentialError || !credentialId) {
      console.error('[reclass-stk] M-Pesa credential resolution failed:', credentialError?.message);
      return internalError(req);
    }

    const { data: credential, error: decryptError } = await supabase.rpc('decrypt_reclass_mpesa_credential', {
      p_id: credentialId,
    });
    if (decryptError || !credential) {
      console.error('[reclass-stk] M-Pesa credential decryption failed:', decryptError?.message);
      return internalError(req);
    }

    const environment = credential.environment === 'sandbox' ? 'sandbox' : 'production';
    const base = environment === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
    const auth = btoa(`${credential.consumer_key}:${credential.consumer_secret}`);
    const oauthResponse = await fetchWithRetry(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!oauthResponse.ok) {
      console.error('[reclass-stk] Daraja OAuth failed:', oauthResponse.status);
      return internalError(req);
    }
    const oauth = await oauthResponse.json();
    if (!oauth.access_token) return internalError(req);

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const password = btoa(`${credential.passkey}${credential.shortcode}${timestamp}`);
    const { public_url } = await getPlatformConfig(supabase, ['public_url']);
    if (!public_url) return internalError(req);

    const callbackUrl = `${public_url}/functions/v1/reclass-mpesa-callback`;
    const stkResponse = await fetchWithRetry(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oauth.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: credential.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: credential.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: String(accountReference).slice(0, 12),
        TransactionDesc: 'eShule ReClass payment',
      }),
    });

    const stk = await stkResponse.json().catch(() => ({}));
    const checkoutId = stk?.CheckoutRequestID;
    if (stk?.ResponseCode !== '0' || typeof checkoutId !== 'string' || !checkoutId) {
      await supabase.rpc('fail_reclass_paybill_transaction', {
        p_transaction_id: transactionId,
        p_reason: typeof stk?.ResponseDescription === 'string' ? stk.ResponseDescription : 'M-Pesa STK rejected',
      });
      return json({ error: 'STK_REJECTED', message: stk?.ResponseDescription ?? 'M-Pesa rejected the request' }, 400, req);
    }

    const { data: submitted, error: submitError } = await supabase.rpc('submit_parent_reclass_stk', {
      p_transaction_id: transactionId,
      p_checkout_id: checkoutId,
    });
    if (submitError) {
      console.error('[reclass-stk] transaction submit failed:', submitError.message);
      return internalError(req);
    }

    return json({
      ok: true,
      transaction_id: transactionId,
      checkout_request_id: checkoutId,
      status: submitted?.status ?? 'submitted',
      customer_message: stk?.CustomerMessage ?? 'Please complete the M-Pesa prompt on your phone.',
    }, 200, req);
  } catch (error) {
    console.error('[reclass-stk] unexpected error:', error instanceof Error ? error.message : String(error));
    return internalError(req);
  }
});
