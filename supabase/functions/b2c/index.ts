import { getServiceClient } from '../_shared/supabase.ts';
import { json, badRequest, handleOptions, internalError } from '../_shared/response.ts';
import { getPlatformConfig } from '../_shared/platform-config.ts';

// B2C payroll disbursement — pays a teacher's approved remedial payroll run
// via Daraja BusinessPayment (M-Pesa send to the teacher's phone).
//
// Flow: bearer (service-role) → claim_payroll_run (approved→processing, mints
// idempotent b2c_checkout_id) → pre-flight checks → Daraja B2C → local tracking.
// The async result (paid/failed) is finalized by `b2c-result` via the ResultURL.
//
// Pre-flight checks BEFORE any Daraja request:
//   - run is processing and belongs to the tenant   (claim already enforced)
//   - mpesa credential resolves + decrypts           (CREDS_NOT_FOUND)
//   - credential carries initiator_name + security_credential (B2C required)
//   - teacher has a valid M-Pesa number (2541/2547)  (TEACHER_PHONE_REQUIRED)
//   - teacher has an id_number                       (TEACHER_ID_REQUIRED)
//   - amount > 0                                     (INVALID_AMOUNT)
//   - credential shortcode present (PartyA)          (SHORTCODE_REQUIRED)
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function fetchWithRetry(url: string, opts: RequestInit, attempt = 0): Promise<Response> {
  try {
    return await fetch(url, opts);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const delay = BASE_DELAY_MS * 2 ** attempt;
    console.warn(`[b2c] fetch attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (err as Error).message);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, opts, attempt + 1);
  }
}

function cleanPhone(raw: string): string {
  return String(raw ?? '').replace(/[\s\-\()\.\+]/g, '');
}

async function finalizeFailure(supabase: ReturnType<typeof getServiceClient>, tenantId: string, checkoutId: string, reason: string) {
  const { error } = await supabase.rpc('finalize_payroll_b2c', {
    p_tenant_id: tenantId,
    p_b2c_checkout_id: checkoutId,
    p_result_code: 1,
    p_result_desc: reason,
  });
  if (error) console.error('[b2c] finalize failure failed:', error.message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    // This endpoint is server-invoked only (service-role bearer, same gate as `notify`).
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return json({ error: 'unauthorized' }, 401, req);
    }

    const supabase = getServiceClient();
    const body = await req.json().catch(() => null);
    const tenantId = body?.tenant_id;
    const runId = body?.run_id;
    if (typeof tenantId !== 'string' || typeof runId !== 'string') {
      return badRequest('run_id_and_tenant_id_required', req);
    }

    // Claim atomically: approved→processing, idempotent checkout id minted inside.
    const { data: claim, error: claimError } = await supabase.rpc('claim_payroll_run', {
      p_tenant_id: tenantId,
      p_run_id: runId,
      p_profile_id: body?.actor_id ?? null,
    });
    if (claimError || !claim) {
      return json({ error: 'CLAIM_FAILED', message: 'Unable to claim the payroll run for B2C.' }, 409, req);
    }
    if (claim.status !== 'claimed') {
      // Idempotent: a run already processing/paid/failed is reported, not re-pushed.
      return json({ status: claim.status, message: `Payroll run is ${claim.status}. No payment sent.` }, claim.status === 'not_found' ? 404 : 409, req);
    }

    const { run_id, amount, teacher_phone, teacher_id_number, teacher_name, b2c_checkout_id } = claim as Record<string, unknown>;

    // ── Pre-flight checks (before Daraja) ────────────────────────────────
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'INVALID_AMOUNT');
      return json({ error: 'INVALID_AMOUNT', message: 'Payroll amount must be greater than zero.' }, 400, req);
    }
    const phone = cleanPhone(String(teacher_phone ?? ''));
    if (!/^254(7|1)\d{8}$/.test(phone)) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'TEACHER_PHONE_REQUIRED');
      return json({ error: 'TEACHER_PHONE_REQUIRED', message: `Teacher (${teacher_name ?? 'unknown'}) has no valid Kenyan M-Pesa number on file. Add it under SIS → Teachers before paying.` }, 400, req);
    }
    if (typeof teacher_id_number !== 'string' || !String(teacher_id_number).trim()) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'TEACHER_ID_REQUIRED');
      return json({ error: 'TEACHER_ID_REQUIRED', message: `Teacher (${teacher_name ?? 'unknown'}) has no National ID on file. Add it under SIS → Teachers before paying.` }, 400, req);
    }

    // Resolve + decrypt the tenant's M-Pesa credential.
    const { data: credId } = await supabase.rpc('resolve_credential', {
      p_tenant: tenantId,
      p_provider: 'mpesa',
      p_allow_sandbox: false,
    });
    if (!credId) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'CREDS_NOT_FOUND');
      return json({ error: 'CREDS_NOT_FOUND', message: 'No active M-Pesa credential configured. Add one in Admin → Credentials.' }, 400, req);
    }
    const { data: s } = await supabase.rpc('decrypt_tenant_credential', { p_id: credId, p_tenant: tenantId });
    if (!s?.consumer_key || !s?.consumer_secret) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'CREDS_INVALID');
      return json({ error: 'CREDS_INVALID', message: 'M-Pesa credential is malformed.' }, 400, req);
    }
    const initiatorName = s.initiator_name;
    const securityCred = s.security_credential;
    if (typeof initiatorName !== 'string' || !initiatorName || typeof securityCred !== 'string' || !securityCred) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'B2C_CREEDS_REQUIRED');
      return json({ error: 'B2C_CREEDS_REQUIRED', message: 'The M-Pesa credential is missing initiator_name or security_credential. Add both in Admin → Credentials.' }, 400, req);
    }

    const base = s.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    // PartyA is the paybill that owns the B2C initiator identity — the same
    // shortcode stored on the credential (mirrors STK, which uses it as
    // BusinessShortCode/PartyB).
    const partyA = String(s.shortcode ?? '');
    if (!partyA) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'SHORTCODE_REQUIRED');
      return json({ error: 'SHORTCODE_REQUIRED', message: 'The M-Pesa credential has no shortcode.' }, 400, req);
    }

    const authHdr = btoa(`${s.consumer_key}:${s.consumer_secret}`);
    const { access_token } = await fetchWithRetry(
      `${base}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${authHdr}` } },
    ).then(r => r.json());
    if (!access_token) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'DARAJAAUTH_FAILED');
      return json({ error: 'DARAJAAUTH_FAILED', message: 'Could not authenticate with Daraja (check consumer key/secret).' }, 401, req);
    }

    const { public_url } = await getPlatformConfig(supabase, ['public_url']);
    if (!public_url) {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), 'PUBLIC_URL_REQUIRED');
      return json({ error: 'PUBLIC_URL_REQUIRED', message: 'PUBLIC_URL is not configured. Set it in Platform Settings.' }, 400, req);
    }
    const resultUrl = `${public_url}/functions/v1/b2c-result`;
    const timeoutUrl = resultUrl; // same handler treats queue-timeout as a failure result

    const resp = await fetchWithRetry(`${base}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        InitiatorName: initiatorName,
        SecurityCredential: securityCred,
        CommandID: 'BusinessPayment',
        Amount: amountNum,
        PartyA: partyA,
        PartyB: phone,
        Remarks: 'eShule remedial payroll',
        QueueTimeOutURL: timeoutUrl,
        ResultURL: resultUrl,
        Occasion: 'Weekly payout',
      }),
    }).then(r => r.json());

    if (resp.ResponseCode !== '0') {
      await finalizeFailure(supabase, tenantId, String(b2c_checkout_id), resp.ResponseDescription ?? 'DARAJAA_REJECTED');
      return json(
        { status: 'rejected', message: resp.ResponseDescription ?? 'Daraja rejected the payout request.' },
        409, req,
      );
    }

    // Accepted: keep processing (await async result). Nice-to-have traceability for ops.
    console.log(`[b2c] accepted ${businessResponseId(resp)} run=${run_id} checkout=${b2c_checkout_id} amount=${amountNum} phone=${phone}`);
    return json({ status: 'processing', run_id, phone, amount: amountNum }, 200, req);
  } catch (err) {
    console.error('[b2c] error:', (err as Error).message);
    return internalError(req);
  }
});

function businessResponseId(resp: Record<string, unknown>): string {
  return String(resp?.OriginatorConversationID ?? resp?.ConversationID ?? resp?.ResponseCode ?? '');
}