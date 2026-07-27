import { getServiceClient } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { json, badRequest, unauthorized, forbidden, handleOptions, internalError } from '../_shared/response.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    const supabase = getServiceClient();
    const user = await verifyAuth(req.headers.get('Authorization'));
    if (!user) return unauthorized(req);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id);
    const isAdmin = roles?.some(r => r.role === 'school_admin' || r.role === 'super_admin');
    if (!isAdmin) return forbidden(req);

    const { credential_id } = await req.json();
    if (!credential_id) return badRequest('credential_id_required', req);

    const adminTenantIds = new Set(roles.filter(r => r.role === 'school_admin').map(r => r.tenant_id));
    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      const { data: cred } = await supabase
        .from('credentials')
        .select('tenant_id')
        .eq('id', credential_id)
        .maybeSingle();
      if (!cred || !adminTenantIds.has(cred.tenant_id)) {
        return forbidden(req);
      }
    }

    const { data: s, error } = await supabase.rpc('decrypt_credential', { p_id: credential_id });
    if (error || !s) return badRequest('decrypt', req);

    let ok = false, detail = '';
    if (s.consumer_key) {
      const base = s.environment === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
      const r = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${btoa(`${s.consumer_key}:${s.consumer_secret}`)}` } }).then(r => r.json());
      ok = !!r.access_token; detail = r.access_token ? 'token_ok' : r.errorMessage ?? 'no_token';
    } else if (s.api_token) {
      const r = await fetch(`${Deno.env.get('MOBIWAVE_BASE') ?? 'https://sms.mobiwave.co.ke/api/v3'}/balance`,
        { headers: { Authorization: `Bearer ${s.api_token}` } }).then(r => r.json());
      ok = r?.code === 1; detail = ok ? `balance_${r.data?.balance}` : r?.message ?? 'bad_token';
    }

    await supabase.from('credentials').update(
      { test_status: ok ? 'ok' : 'failed', last_tested_at: new Date().toISOString() }).eq('id', credential_id);
    return json({ status: ok ? 'ok' : 'failed', detail }, 200, req);
  } catch {
    return internalError(req);
  }
});
