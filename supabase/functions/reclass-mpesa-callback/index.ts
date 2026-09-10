import { getServiceClient } from '../_shared/supabase.ts';
import { handleOptions, internalError, json } from '../_shared/response.ts';

type CallbackItem = { Name?: string; Value?: string | number };
type DarajaCallback = {
  Body?: {
    stkCallback?: {
      ResultCode?: number;
      ResultDesc?: string;
      CheckoutRequestID?: string;
      CallbackMetadata?: { Item?: CallbackItem[] };
    };
  };
};

function parseCallback(body: unknown): DarajaCallback {
  return body && typeof body === 'object' ? body as DarajaCallback : {};
}

function metadataValue(stk: DarajaCallback['Body']['stkCallback'], name: string): string | number | null {
  const item = stk?.CallbackMetadata?.Item?.find((entry) => entry?.Name === name);
  return item?.Value ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, req);

  try {
    const raw = await req.json();
    const body = parseCallback(raw);
    const stk = body.Body?.stkCallback;
    const checkout = typeof stk?.CheckoutRequestID === 'string' ? stk.CheckoutRequestID.trim() : '';
    const code = stk?.ResultCode;
    if (!checkout || typeof code !== 'number') return json({ error: 'INVALID_CALLBACK' }, 400, req);

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

    if (code !== 0) {
      const { error } = await supabase.rpc('fail_reclass_paybill_transaction', {
        p_transaction_id: tx.id,
        p_reason: stk?.ResultDesc?.trim() || 'M-Pesa STK failed',
      });
      if (error && !/terminal|failed|cancelled|rejected/i.test(error.message)) {
        console.error('[reclass-mpesa-callback] failure transition failed:', error.message);
        return internalError(req);
      }
      return json({ ok: true, status: 'failed', transaction_id: tx.id }, 200, req);
    }

    const receipt = metadataValue(stk, 'MpesaReceiptNumber');
    const amount = metadataValue(stk, 'Amount');
    const phone = metadataValue(stk, 'PhoneNumber');
    if (typeof receipt !== 'string' || !receipt.trim() || typeof amount !== 'number') {
      console.error('[reclass-mpesa-callback] successful callback missing required payment metadata');
      return json({ error: 'INCOMPLETE_CALLBACK' }, 400, req);
    }

    const { data, error } = await supabase.rpc('reconcile_reclass_paybill_transaction', {
      p_transaction_id: tx.id,
      p_checkout_id: checkout,
      p_mpesa_receipt: receipt.trim(),
      p_amount: amount,
      p_phone: typeof phone === 'string' ? phone : tx.phone,
      p_student_id: tx.student_id,
      p_obligation_id: tx.obligation_id,
    });
    if (error) {
      console.error('[reclass-mpesa-callback] reconciliation failed:', error.message);
      return internalError(req);
    }

    return json({ ok: true, status: data?.status ?? 'completed', transaction: data }, 200, req);
  } catch (error) {
    console.error('[reclass-mpesa-callback] unexpected error:', error instanceof Error ? error.message : String(error));
    return internalError(req);
  }
});
