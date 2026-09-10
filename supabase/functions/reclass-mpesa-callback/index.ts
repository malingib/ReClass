import { getServiceClient } from '../_shared/supabase.ts';
import { handleOptions, internalError, json } from '../_shared/response.ts';

function resultCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const callback = value.Body as Record<string, unknown> | undefined;
  const stk = callback?.stkCallback as Record<string, unknown> | undefined;
  return typeof stk?.ResultCode === 'number' ? String(stk.ResultCode) : null;
}

function checkoutId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const callback = value.Body as Record<string, unknown> | undefined;
  const stk = callback?.stkCallback as Record<string, unknown> | undefined;
  return typeof stk?.CheckoutRequestID === 'string' && stk.CheckoutRequestID.trim()
    ? stk.CheckoutRequestID.trim()
    : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, req);

  try {
    const body = await req.json();
    const checkout = checkoutId(body);
    const code = resultCode(body);
    if (!checkout || code === null) return json({ error: 'INVALID_CALLBACK' }, 400, req);

    const supabase = getServiceClient();
    const { data: tx, error: lookupError } = await supabase
      .from('reclass_paybill_transactions')
      .select('id,status,amount,phone,student_id,obligation_id,checkout_id')
      .eq('checkout_id', checkout)
      .maybeSingle();

    if (lookupError) {
      console.error('[reclass-mpesa-callback] transaction lookup failed:', lookupError.message);
      return internalError(req);
    }
    if (!tx) return json({ error: 'TRANSACTION_NOT_FOUND' }, 404, req);

    if (code !== '0') {
      const reason = body?.Body?.stkCallback?.ResultDesc;
      const { error } = await supabase.rpc('fail_reclass_paybill_transaction', {
        p_transaction_id: tx.id,
        p_reason: typeof reason === 'string' && reason.trim() ? reason.trim() : 'M-Pesa STK failed',
      });
      if (error && !/terminal|failed|cancelled|rejected/i.test(error.message)) {
        console.error('[reclass-mpesa-callback] failure transition failed:', error.message);
        return internalError(req);
      }
      return json({ ok: true, status: 'failed', transaction_id: tx.id }, 200, req);
    }

    const { data, error } = await supabase.rpc('reconcile_reclass_paybill_transaction', {
      p_transaction_id: tx.id,
      p_provider_reference: checkout,
      p_metadata: body,
    });
    if (error) {
      console.error('[reclass-mpesa-callback] reconciliation failed:', error.message);
      return internalError(req);
    }

    return json({ ok: true, status: 'completed', transaction: data }, 200, req);
  } catch (error) {
    console.error('[reclass-mpesa-callback] unexpected error:', error instanceof Error ? error.message : String(error));
    return internalError(req);
  }
});
