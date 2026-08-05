import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();

  // Ping DB connectivity with a safe count query
  let dbConnected = false;
  try {
    // The server client bypasses RLS, so even a metadata-only query must be
    // tenant-scoped. Super-admin requests without an impersonated tenant use
    // the global tenants table instead.
    const query = locals.tenantId
      ? locals.srv
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', locals.tenantId)
          .limit(1)
      : locals.srv
          .from('tenants')
          .select('id', { count: 'exact', head: true })
          .limit(1);
    const { error } = await query;
    if (!error) dbConnected = true;
  } catch {
    // DB unreachable — report status below
  }

  return json({
    status: 'ok',
    uptime: process.uptime(),
    authenticated: !!user,
    db: dbConnected ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
};
