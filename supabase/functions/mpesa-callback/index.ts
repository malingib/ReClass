import { getServiceClient } from '../_shared/supabase.ts';
import { json, badRequest, unauthorized, internalError } from '../_shared/response.ts';
import { getPlatformConfig } from '../_shared/platform-config.ts';

const supabase = getServiceClient();
const MAX_BODY_BYTES = 10_240;

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, req);
    }

    // Enforce callback secret (fail closed when absent). Resolved from the
    // platform admin's DB config, falling back to the env var.
    const { mpesa_callback_secret: callbackSecret } = await getPlatformConfig(supabase, ['mpesa_callback_secret']);
    if (!callbackSecret) {
      console.error('mpesa-callback: MPESA_CALLBACK_SECRET not configured');
      return internalError(req);
    }
    const actual = req.headers.get('x-callback-secret') ?? '';
    if (actual !== callbackSecret) {
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
    const metadata = Array.isArray(stk.CallbackMetadata?.Item) ? stk.CallbackMetadata.Item : [];
    const getMeta = (name: string) => metadata.find((item) => item?.Name === name)?.Value;
    const amount = Number(getMeta('Amount') ?? stk.Amount);
    const phone = String(getMeta('PhoneNumber') ?? stk.PhoneNumber ?? '');
    // The account reference the payer used: admission number for eShule STK
    // pushes AND manual paybill deposits (Lipa na M-Pesa) typed at the till.
    const billRef = String(getMeta('BillRefNumber') ?? '').trim();

    if (!CheckoutRequestID || ResultCode === undefined)
      return badRequest('invalid_callback', req);

    if (ResultCode !== 0) {
      await supabase.from('checkout_requests').update({ status: 'failed', reason: String(ResultDesc ?? '') })
        .eq('checkout_id', CheckoutRequestID);
      return json({ status: 'failed', reason: ResultDesc }, 200, req);
    }

    // Fast path: app-initiated STK push — the checkout row already knows the
    // student + fee. (Manual paybill deposits have NO checkout row.)
    const { data: cr, error: e } = await supabase.from('checkout_requests')
      .select('id, fee_type_id, student_id, tenant_id, amount, phone, status').eq('checkout_id', CheckoutRequestID).single();

    if (!e && cr) {
      if (cr.status === 'completed')
        return json({ status: 'already_reconciled' }, 200, req);

      if (!Number.isFinite(amount) || amount !== Number(cr.amount)) {
        await supabase.from('checkout_requests').update({ status: 'failed', reason: 'amount_mismatch' }).eq('id', cr.id);
        return json({ status: 'amount_mismatch' }, 409, req);
      }

      const expectedPhone = String(cr.phone ?? '').replace(/\D/g, '');
      const actualPhone = phone.replace(/\D/g, '');
      if (!expectedPhone || !actualPhone || expectedPhone !== actualPhone) {
        await supabase.from('checkout_requests').update({ status: 'failed', reason: 'phone_mismatch' }).eq('id', cr.id);
        return json({ status: 'phone_mismatch' }, 409, req);
      }

      // Reconcile with the checkout's student context (v3 RPC stamps it).
      const { data: rec } = await supabase.rpc('reconcile_payment', {
        p_checkout_id: CheckoutRequestID, p_amount: cr.amount,
        p_phone: phone, p_tenant_id: cr.tenant_id,
        p_student_id: cr.student_id, p_fee_type_id: cr.fee_type_id, p_domain: 'remedial',
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

      await enqueueReceiptSms(cr.tenant_id, payment?.id ?? cr.id, phone, cr.amount);
      return json(rec, 200, req);
    }

    // ── Manual paybill deposit (no checkout row) — route by BillRefNumber ──
    // BillRefNumber = admission number (eShule convention). Resolve the student
    // and reconcile in one shot. Unresolvable account references are logged but
    // NOT recorded (payments.tenant_id is NOT NULL) — the money sits at the
    // paybill and the school reconciles it manually from the M-Pesa statement.
    if (billRef) {
      const { data: student } = await supabase.from('students')
        .select('id, tenant_id')
        .eq('admission_no', billRef)
        .maybeSingle();
      if (student) {
        // Best-effort fee context: try a fee type matching the amount.
        const { data: feeType } = await supabase.from('fee_types')
          .select('id, domain')
          .eq('tenant_id', student.tenant_id)
          .eq('amount', amount)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();
        const feeTypeId = feeType?.id ?? null;
        const domain = feeType?.domain === 'school' ? 'school' : 'remedial';
        const { data: rec } = await supabase.rpc('reconcile_payment', {
          p_checkout_id: CheckoutRequestID, p_amount: amount,
          p_phone: phone, p_tenant_id: student.tenant_id,
          p_student_id: student.id, p_fee_type_id: feeTypeId, p_domain: domain,
        });
        if (rec?.status !== 'completed' && rec?.status !== 'duplicate') {
          return json(rec ?? { status: 'reconciliation_failed' }, 409, req);
        }
        const { data: payment } = await supabase
          .from('payments').select('id, tenant_id')
          .eq('mpesa_checkout_id', CheckoutRequestID).maybeSingle();
        if (payment) {
          await supabase.from('payments').update({
            receipt_no: `RCP-${payment.tenant_id.slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${CheckoutRequestID.slice(0, 5).toUpperCase()}`,
          }).eq('id', payment.id);
          await enqueueReceiptSms(payment.tenant_id, payment.id, phone, amount);
        }
        return json(rec, 200, req);
      }
      // Unknown admission number → cannot attribute a tenant. Park the deposit
      // in the unmatched queue so the school can match it from the M-Pesa
      // statement (admin/bursar UI), without losing the money. In this
      // single-tenant deployment the tenant is the active school, so stamp it
      // for attribution + the unmatched-deposit alert trigger.
      const mpesaReceipt = String(getMeta('MpesaReceiptNumber') ?? '');
      const { data: activeTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      await supabase.from('unmatched_payments').insert({
        tenant_id: activeTenant?.id ?? null,
        checkout_id: CheckoutRequestID, mpesa_receipt: mpesaReceipt || null,
        amount, phone, bill_ref: billRef || null,
      }).then((r) => {
        if (r.error) console.error('[mpesa-callback] unmatched insert failed:', r.error.message);
      });
      console.warn(`[mpesa-callback] unmatched manual deposit parked: billRef=${billRef} amount=${amount} checkout=${CheckoutRequestID}`);
      return json({ status: 'unmatched_admission', billRef }, 200, req);
    }

    // No account reference at all — nothing to route by.
    console.warn(`[mpesa-callback] manual deposit without BillRefNumber: amount=${amount} checkout=${CheckoutRequestID}`);
    return json({ status: 'missing_bill_ref' }, 200, req);
  } catch {
    return internalError(req);
  }
});

/** Enqueue an SMS receipt notification when the tenant has the toggle on. */
async function enqueueReceiptSms(tenantId: string, relatedId: string, phone: string, amount: number) {
  try {
    const { data: receiptOn } = await supabase.rpc('tenant_setting_enabled',
      { p_tenant: tenantId, p_key: 'sms_payment_receipt' });
    if (!receiptOn) return;
    const externalId = `mpesa-receipt:${relatedId}`;
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('channel', 'sms')
      .eq('external_id', externalId)
      .eq('related_type', 'payment')
      .eq('related_id', relatedId)
      .maybeSingle();
    if (existing) return;

    const { error } = await supabase.from('notifications').insert({
      tenant_id: tenantId, related_type: 'payment', related_id: relatedId, channel: 'sms',
      external_id: externalId,
      recipient: phone,
      body: `eShule: Payment of KES ${amount} received. Receipt: ${relatedId.slice(0, 8)}`,
      status: 'queued',
    });
    if (error && error.code !== '23505') throw error;
  } catch (err) {
    console.error('enqueueReceiptSms failed:', (err as Error).message);
  }
}
