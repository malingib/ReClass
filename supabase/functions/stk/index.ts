import { getServiceClient } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { json, badRequest, unauthorized, forbidden, notFound, handleOptions, internalError } from '../_shared/response.ts';
import { getPlatformConfig } from '../_shared/platform-config.ts';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// Simple metrics collector for STK function
const stkMetrics = {
  initDuration: [] as number[],
  failures: 0,
  successes: 0,
  darajaFailures: 0
};

function recordSTKInit(duration: number): void {
  stkMetrics.initDuration.push(duration);
  if (stkMetrics.initDuration.length > 100) {
    stkMetrics.initDuration.shift();
  }
}

function recordSTKFailure(): void {
  stkMetrics.failures++;
}

function recordSTKSuccess(): void {
  stkMetrics.successes++;
}

function recordDarajaFailure(): void {
  stkMetrics.darajaFailures++;
}

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

  const startTime = Date.now();

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

    // Resolve the tenant's payment channel for THIS domain (one per domain:
    // bank OR mpesa). If the domain is on bank (KCB), refuse STK — the client
    // shows bank details instead.
    const { data: tenant } = await supabase.from('tenants')
      .select('school_payment_channel, remedial_payment_channel')
      .eq('id', parent.tenant_id)
      .single();
    const domain = feeType.domain === 'school' ? 'school' : 'remedial';
    const channel = domain === 'school'
      ? tenant?.school_payment_channel ?? 'bank'
      : tenant?.remedial_payment_channel ?? 'mpesa';
    if (channel !== 'mpesa') {
      return json({ error: 'BANK_CHANNEL', message: 'This fee is paid by bank transfer. Use the bank payment details instead.' }, 400, req);
    }

    // The student's admission number is the M-Pesa AccountReference (≤ 12 chars),
    // so the callback (and manual paybill deposits) route to the right student.
    const { data: student } = await supabase.from('students')
      .select('admission_no')
      .eq('id', student_id)
      .eq('tenant_id', parent.tenant_id)
      .maybeSingle();
    if (!student?.admission_no) return notFound('STUDENT_NOT_FOUND', req);
    const accountRef = student.admission_no.slice(0, 12);

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
    // Normalize to international 254 format: strip separators, then convert a
    // leading 0 (0712… → 254712…) or bare 7xx (712… → 254712…) so phone numbers
    // stored in local formats still pass the Daraja phone validation.
    const digits = parent.phone.replace(/[\s\-\()\.\+]/g, '');
    const normalizedPhone = /^0/.test(digits)
      ? `254${digits.slice(1)}`
      : /^7/.test(digits)
        ? `254${digits}`
        : digits;
    const validPhone = /^254[17]\d{8}$/.test(normalizedPhone);
    const amount = Number(feeType.amount);
    if (amount <= 0 || !validPhone) {
      return badRequest('INVALID_PAYMENT_DETAILS', req);
    }
    const payPhone = normalizedPhone;

    const { data: cred_id } = await supabase.rpc('resolve_credential',
      { p_tenant: tenant_id, p_provider: 'mpesa', p_allow_sandbox: false });
    if (!cred_id) return badRequest('CREDS_NOT_FOUND', req);

    const { data: secrets } = await supabase.rpc('decrypt_tenant_credential', {
      p_id: cred_id,
      p_tenant: tenant_id,
    });
    const base = secrets.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    // Daraja OAuth — direct with retry (no external circuit-breaker import)
    let access_token: string;
    try {
      const auth = btoa(`${secrets.consumer_key}:${secrets.consumer_secret}`);
      const oauthRes = await fetchWithRetry(
        `${base}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (!oauthRes.ok) {
        console.error(`[stk] OAuth token request failed with ${oauthRes.status}`);
        recordDarajaFailure();
        throw new Error(`OAuth request failed: ${oauthRes.status}`);
      }
      const oauthJson = await oauthRes.json();
      access_token = oauthJson.access_token;
      if (!access_token) {
        console.error('[stk] OAuth token response missing access_token');
        recordDarajaFailure();
        throw new Error('OAuth token response missing access_token');
      }
    } catch (error) {
      console.error('[stk] Daraja OAuth failed:', (error as Error).message);
      return internalError(req);
    }

    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const pwd = btoa(`${secrets.passkey}${secrets.shortcode}${ts}`);
    const { public_url } = await getPlatformConfig(supabase, ['public_url']);
    if (!public_url) {
      console.error('[stk] PUBLIC_URL not configured');
      return internalError(req);
    }
    const callback = `${public_url}/functions/v1/mpesa-callback`;

    // Pre-insert checkout request BEFORE STK push so a crash after
    // provider acceptance still has local tracking for reconciliation.
    const checkoutId = crypto.randomUUID();
    const { error: checkoutInsertError } = await supabase.from('checkout_requests').insert({
      tenant_id, fee_type_id, student_id, checkout_id: checkoutId,
      amount, phone: payPhone, status: 'pending',
    });
    if (checkoutInsertError) {
      // The database has a partial unique index for one pending request per
      // student/fee. Treat a conflict as an expected duplicate rather than a
      // generic provider failure.
      if (checkoutInsertError.code === '23505') {
        return json({ error: 'DUPLICATE_REQUEST', message: 'A payment request for this fee is already being processed.' }, 429, req);
      }
      console.error('[stk] checkout insert failed:', checkoutInsertError.message);
      return internalError(req);
    }

    const stkRes = await fetchWithRetry(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: secrets.shortcode, Password: pwd, Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline', Amount: amount,
        PartyA: payPhone, PartyB: secrets.shortcode, PhoneNumber: payPhone,
        CallBackURL: callback, AccountReference: accountRef,
        TransactionDesc: `eShule ${domain === 'school' ? 'fees' : 'remedial'} payment`,
      }),
    });
    let stk: { ResponseCode?: string; ResponseDescription?: string; CheckoutRequestID?: string };
    try {
      stk = await stkRes.json();
    } catch {
      console.error(`[stk] non-JSON STK response (${stkRes.status})`);
      await supabase.from('checkout_requests')
        .update({ status: 'failed', reason: `UPSTREAM_HTTP_${stkRes.status}` })
        .eq('checkout_id', checkoutId);
      recordSTKFailure();
      return internalError(req);
    }

    if (stk.ResponseCode !== '0') {
      await supabase.from('checkout_requests')
        .update({ status: 'failed', reason: stk.ResponseDescription ?? 'STK rejected' })
        .eq('checkout_id', checkoutId);
      recordSTKFailure();
    } else {
      await supabase.from('checkout_requests')
        .update({ checkout_id: stk.CheckoutRequestID })
        .eq('checkout_id', checkoutId);
      recordSTKSuccess();
    }

    // Record metrics
    const duration = Date.now() - startTime;
    recordSTKInit(duration);

    return json({ 
      ...stk, 
      metrics: {
        duration,
        successRate: stkMetrics.successes / (stkMetrics.successes + stkMetrics.failures) * 100 || 0,
        darajaFailures: stkMetrics.darajaFailures
      }
    }, 200, req);
  } catch (err) {
    console.error('[stk] unexpected error:', (err as Error).message ?? String(err));
    recordSTKFailure();
    return internalError(req);
  }
});
