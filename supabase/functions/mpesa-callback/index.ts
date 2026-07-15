import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { CheckoutRequestID, ResultCode, ResultDesc, Amount, PhoneNumber, BillRefNumber } =
      body?.Body?.stkCallback ?? {};
    if (!CheckoutRequestID || ResultCode === undefined)
      return new Response(JSON.stringify({ error: 'invalid_callback' }), { status: 400, headers: corsHeaders });

    if (ResultCode !== 0) {
      await supabase.from('checkout_requests').update({ status: 'failed', reason: ResultDesc })
        .eq('checkout_id', CheckoutRequestID);
      return new Response(JSON.stringify({ status: 'failed', reason: ResultDesc }), { headers: corsHeaders });
    }

    const { data: cr, error: e } = await supabase.from('checkout_requests')
      .select('id, invoice_id, tenant_id, amount, status').eq('checkout_id', CheckoutRequestID).single();
    if (e || !cr) return new Response(JSON.stringify({ error: 'unknown_checkout' }), { status: 404, headers: corsHeaders });
    if (cr.status === 'completed')
      return new Response(JSON.stringify({ status: 'already_reconciled' }), { headers: corsHeaders });

    const { data: rec } = await supabase.rpc('reconcile_payment', {
      p_checkout_id: CheckoutRequestID, p_amount: Amount ?? cr.amount,
      p_phone: PhoneNumber ?? '', p_tenant_id: cr.tenant_id
    });
    await supabase.from('checkout_requests').update({ status: 'completed' }).eq('id', cr.id);
    await supabase.from('notifications').insert({
      tenant_id: cr.tenant_id, related_type: 'invoice', related_id: cr.invoice_id, channel: 'sms',
      recipient: PhoneNumber ?? '', body: `ReClass: Payment of KES ${Amount ?? cr.amount} received. Receipt: ${CheckoutRequestID.slice(0, 8)}`,
      status: 'queued'
    });
    return new Response(JSON.stringify(rec), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
