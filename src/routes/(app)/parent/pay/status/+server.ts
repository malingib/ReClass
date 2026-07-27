import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  const invoiceId = url.searchParams.get('invoice_id');
  if (!invoiceId) return new Response('Missing invoice_id', { status: 400 });

  const { data } = await locals.srv
    .from('checkout_requests')
    .select('status, amount')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', locals.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return new Response(JSON.stringify(data ?? { status: 'unknown' }), {
    headers: { 'content-type': 'application/json' },
  });
};
