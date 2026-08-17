import { logError } from '../_platform/log';

/**
 * Enqueue a "payment received" SMS receipt for a payment created by the app
 * server (bank transfers, manual unmatched matches). Mirrors the M-Pesa
 * callback's receipt SMS but for app-originated receipts, and always deduped
 * per payment. Respects the tenant's sms_payment_receipt toggle.
 *
 * Returns true when the SMS was queued (or already queued).
 */
export async function enqueuePaymentReceiptSms(
  sb: App.Locals['srv'],
  tenantId: string,
  paymentId: string,
  phone: string,
  amount: number,
): Promise<boolean> {
  if (!phone) return false;
  try {
    const { data: toggleOn } = await sb.rpc('tenant_setting_enabled', {
      p_tenant: tenantId,
      p_key: 'sms_payment_receipt',
    });
    if (!toggleOn) return false;

    const externalId = `payment-receipt:${paymentId}`;
    const { data: existing } = await sb
      .from('notifications')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', 'sms')
      .eq('external_id', externalId)
      .maybeSingle();
    if (existing) return true;

    const { error } = await sb.from('notifications').insert({
      tenant_id: tenantId,
      related_type: 'payment',
      related_id: paymentId,
      channel: 'sms',
      external_id: externalId,
      recipient: phone,
      body: `eShule: Payment of KES ${Number(amount).toFixed(2)} received. Receipt: ${paymentId.slice(0, 8)}`,
      status: 'queued',
    });
    if (error && error.code !== '23505') {
      logError('receipt_sms_enqueue', error, { tenantId, paymentId });
      return false;
    }
    return true;
  } catch (err) {
    logError('receipt_sms_enqueue', err, { tenantId, paymentId });
    return false;
  }
}

/** The parent (or guardian) phone to notify for a student's payment receipt. */
export async function getStudentPayerPhone(sb: App.Locals['srv'], tenantId: string, studentId: string): Promise<string | null> {
  const { data } = await sb
    .from('guardians_link')
    .select('parents(phone, sms_consent)')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();
  const parent = data?.parents as { phone: string | null; sms_consent: boolean | null } | null;
  if (!parent?.phone || parent.sms_consent === false) return null;
  return parent.phone;
}