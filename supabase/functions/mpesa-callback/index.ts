import { getServiceClient } from '../_shared/supabase.ts';
import { json, badRequest, notFound, unauthorized, internalError } from '../_shared/response.ts';

const supabase = getServiceClient();
const CALLBACK_SECRET = Deno.env.get('MPESA_CALLBACK_SECRET') ?? '';
const MAX_BODY_BYTES = 10_240;

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, req);
    }

    // Enforce callback secret (fail closed when absent)
    if (!CALLBACK_SECRET) {
      console.error('mpesa-callback: MPESA_CALLBACK_SECRET not configured');
      return internalError(req);
    }
    const actual = req.headers.get('x-callback-secret') ?? '';
    if (actual !== CALLBACK_SECRET) {
      return unauthorized(req);
    }

    // Limit body size
    const cl = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (cl > MAX_BODY_BYTES) return badRequest('body_too_large', req);

    const body = await req.json();
    const stk = body?.Body?.stkCallback ?? {};
    const CheckoutRequestID = stk.CheckoutRequestID;
    const ResultCode = stk.ResultCode;
    const ResultDesc = stk.ResultDesc;
    const Amount = stk.Amount;
    const PhoneNumber = stk.PhoneNumber;

    if (!CheckoutRequestID || ResultCode === undefined)
      return badRequest('invalid_callback', req);

    if (ResultCode !== 0) {
      await supabase.from('checkout_requests').update({ status: 'failed', reason: String(ResultDesc ?? '') })
        .eq('checkout_id', CheckoutRequestID);
      return json({ status: 'failed', reason: ResultDesc }, 200, req);
    }

    const { data: cr, error: e } = await supabase.from('checkout_requests')
      .select('id, fee_type_id, student_id, tenant_id, amount, status').eq('checkout_id', CheckoutRequestID).single();
    if (e || !cr) return notFound('unknown_checkout', req);
    if (cr.status === 'completed')
      return json({ status: 'already_reconciled' }, 200, req);

    // Use the original checkout amount (server-derived), not the callback-supplied amount
    const finalAmount = Amount ?? cr.amount;
    const finalPhone = PhoneNumber ?? '';

    // Reconcile: stamp the matching payment as paid (idempotent by checkout_id).
    const { data: rec } = await supabase.rpc('reconcile_payment', {
      p_checkout_id: CheckoutRequestID, p_amount: finalAmount,
      p_phone: finalPhone, p_tenant_id: cr.tenant_id,
    });

    if (rec?.status !== 'completed' && rec?.status !== 'duplicate') {
      await supabase.from('checkout_requests').update({ status: 'failed', reason: rec?.status ?? 'reconciliation_failed' }).eq('id', cr.id);
      return json(rec ?? { status: 'reconciliation_failed' }, 409, req);
    }

    // Attach the student + fee context to the receipt (payments are receipts).
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('mpesa_checkout_id', CheckoutRequestID)
      .eq('tenant_id', cr.tenant_id)
      .maybeSingle();
    if (payment) {
      await supabase.from('payments').update({
        student_id: cr.student_id,
        fee_type_id: cr.fee_type_id,
        domain: 'remedial',
        receipt_no: `RCP-${cr.tenant_id.slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${CheckoutRequestID.slice(0, 5).toUpperCase()}`,
      }).eq('id', payment.id);
    }

    await supabase.from('checkout_requests').update({ status: 'completed' }).eq('id', cr.id);

    // Respect the per-tenant sms_payment_receipt toggle before enqueuing a receipt SMS.
    const { data: receiptOn } = await supabase.rpc('tenant_setting_enabled',
      { p_tenant: cr.tenant_id, p_key: 'sms_payment_receipt' });
    if (receiptOn) {
      await supabase.from('notifications').insert({
        tenant_id: cr.tenant_id, related_type: 'payment', related_id: payment?.id ?? cr.id, channel: 'sms',
        recipient: finalPhone,
        body: `ReClass: Payment of KES ${finalAmount} received. Receipt: ${CheckoutRequestID.slice(0, 8)}`,
        status: 'queued',
      });
    }

    return json(rec, 200, req);
  } catch {
    return internalError(req);
  }
});
