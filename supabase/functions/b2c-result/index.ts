import { getServiceClient } from '../_shared/supabase.ts';
import { json, badRequest, unauthorized, internalError } from '../_shared/response.ts';
import { getPlatformConfig } from '../_shared/platform-config.ts';
import { verifySecret } from '../_shared/auth.ts';

const supabase = getServiceClient();
const MAX_BODY_BYTES = 10_240;

// Handles Daraja's asynchronous B2C result request (ResultURL + QueueTimeOutURL).
// - ResultURL:   businessPayment success/failure result from Safaricom.
// - QueueTimeOut: no one has picked the transaction up (treated as failure).
// Finalizes the matching payroll run exactly once (finalize_payroll_b2c is
// idempotent keyed on b2c_checkout_id) and enqueues an SMS to the teacher
// when the payout clears.

function param(parameters: unknown, name: string): string {
  if (!Array.isArray(parameters)) return '';
  for (const item of parameters as Array<{ Key?: string; Value?: unknown }>) {
    if (item?.Key === name) return String(item.Value ?? '');
  }
  return '';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, req);
    }

    // Fail closed when the secret is absent (same posture as mpesa-callback).
    const { mpesa_callback_secret: callbackSecret } = await getPlatformConfig(supabase, ['mpesa_callback_secret']);
    if (!callbackSecret) {
      console.error('b2c-result: MPESA_CALLBACK_SECRET not configured');
      return internalError(req);
    }
    const actual = req.headers.get('x-callback-secret') ?? '';
    if (!(await verifySecret(actual, callbackSecret))) {
      return unauthorized(req);
    }

    const cl = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (cl > MAX_BODY_BYTES) return badRequest('body_too_large', req);

    const raw = await req.text().catch(() => null);
    if (raw === null) return badRequest('missing_originator', req);
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return badRequest('body_too_large', req);
    }

    const body = JSON.parse(raw);
    const result = body?.Result ?? {};
    const OriginatorConversationID = result.OriginatorConversationID ?? body?.OriginatorConversationID;
    if (typeof OriginatorConversationID !== 'string' || !OriginatorConversationID) {
      console.warn('[b2c-result] missing OriginatorConversationID');
      return badRequest('missing_originator', req);
    }

    const ResultCode = Number(result.ResultCode);
    const ResultDesc = String(result.ResultDesc ?? (Number.isNaN(ResultCode) ? 'queue_timeout' : ''));
    // B2C result parameters: TransactionReceipt, TransactionAmount, TransactionCompletedDateTime, ReceiverPartyPublicName, etc.
    const receipt = param(result.ResultParameters, 'TransactionReceipt')
      ?? param(result.ResultParameters, 'MpesaReceiptNumber');

    // Resolve the run to learn its tenant (idempotency is enforced in the RPC).
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, tenant_id, teacher_id, amount')
      .eq('b2c_checkout_id', OriginatorConversationID)
      .maybeSingle();
    if (!run) {
      console.warn(`[b2c-result] no run for originator ${OriginatorConversationID}`);
      return json({ status: 'not_found' }, 200, req);
    }

    const success = ResultCode === 0;
    const { data: res, error } = await supabase.rpc('finalize_payroll_b2c', {
      p_tenant_id: run.tenant_id,
      p_b2c_checkout_id: OriginatorConversationID,
      p_result_code: success ? 0 : ResultCode,
      p_result_desc: ResultDesc,
      p_receipt: success ? receipt : null,
    });
    if (error) {
      console.error('[b2c-result] finalize error:', error.message);
      return internalError(req);
    }

    if (res?.status === 'paid') {
      await enqueuePaidSms(run.tenant_id, run.id, run.teacher_id, run.amount);
    }

    return json({ status: res?.status ?? 'processed' }, 200, req);
  } catch (err) {
    console.error('[b2c-result] error:', (err as Error).message);
    return internalError(req);
  }
});

/** SMS to the teacher when their remedial payout clears (toggle-gated). */
async function enqueuePaidSms(tenantId: string, runId: string, teacherId: string, amount: number) {
  try {
    const { data: on } = await supabase.rpc('tenant_setting_enabled', { p_tenant: tenantId, p_key: 'sms_teacher_payout' });
    if (!on) return;
    const { data: teacher } = await supabase
      .from('teachers').select('phone, first_name, last_name')
      .eq('id', teacherId).eq('tenant_id', tenantId).maybeSingle();
    if (!teacher?.phone) return;

    const externalId = `b2c-paid:${runId}`;
    const { data: existing } = await supabase
      .from('notifications').select('id')
      .eq('channel', 'sms').eq('external_id', externalId)
      .eq('related_type', 'payroll_run').eq('related_id', runId).maybeSingle();
    if (existing) return;

    const { error } = await supabase.from('notifications').insert({
      tenant_id: tenantId, related_type: 'payroll_run', related_id: runId,
      channel: 'sms', external_id: externalId,
      recipient: teacher.phone,
      body: `eShule: Your remedial payout of KES ${Number(amount).toLocaleString()} has been sent to your M-Pesa. Effort received.`,
      status: 'queued',
    });
    if (error && error.code !== '23505') {
      console.error('[b2c-result] enqueuePaidSms failed:', error.message);
    }
  } catch (err) {
    console.error('[b2c-result] enqueuePaidSms error:', (err as Error).message);
  }
}