// ============================================================================
// ReClass Edge Function (PLANNING SKELETON) — supabase/functions/mpesa-callback/index.ts
// Safaricom Daraja STK callback. Verifies integrity, reconciles idempotently,
// credits invoice, fires notification. NEVER trust body blindly — verify the
// CheckoutRequestID maps to a known initiated payment for THIS tenant.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!   // SERVER ONLY
);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const cb = body.Body?.stkCallback;
    if (!cb) return new Response('ok');

    const checkoutRequestId = cb.CheckoutRequestID;
    const resultCode = cb.ResultCode;

    const { data: pay } = await supabase
      .from('payments')
      .select('id, tenant_id, invoice_id, amount, status')
      .eq('reference', checkoutRequestId)
      .single();

    if (!pay) {
      // Unknown callback — reject. (Never credit an unknown request.)
      console.error('UNKNOWN_CALLBACK', checkoutRequestId);
      return new Response('ok');
    }
    if (pay.status === 'completed') return new Response('ok'); // idempotent

    if (resultCode !== 0) {
      await supabase.from('payments').update({ status: 'failed', raw: body }).eq('id', pay.id);
      return new Response('ok');
    }

    const item = cb.CallbackMetadata?.Item ?? [];
    const mpesaReceipt = item.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
    const amount = item.find((i: any) => i.Name === 'Amount')?.Value;

    // Idempotent reconcile: complete payment + credit invoice in one txn via RPC.
    const { error } = await supabase.rpc('reconcile_payment', {
      p_payment_id: pay.id,
      p_invoice_id: pay.invoice_id,
      p_mpesa_receipt: mpesaReceipt,
      p_amount: amount,
    });
    if (error) throw error;

    // Notify parent (uses tenant school_send creds via notification.engine path)
    await supabase.functions.invoke('notify', {
      body: { tenant_id: pay.tenant_id, event: 'payment_received',
              invoice_id: pay.invoice_id, amount, mpesa_receipt: mpesaReceipt },
    });

    return new Response('ok');
  } catch (e) {
    console.error('CALLBACK_ERROR', e);
    return new Response('ok'); // Daraja expects 200; log internally for retry/alert
  }
});

// NOTE: mpesa-callback is a public POST endpoint. Threat model (security.md):
//  - Safaricom does not sign STK callbacks. Mitigations:
//    1) Reject any callback whose CheckoutRequestID is not in `payments`.
//    2) Reconcile against amount+tenant; never credit on callback alone.
//    3) (Optional, stronger) front the callback with a Cloudflare Worker that
//       allows only Safaricom egress IP ranges, then forwards to this function.
//  - Store raw body for audit; alert on UNKNOWN_CALLBACK rate spikes.
