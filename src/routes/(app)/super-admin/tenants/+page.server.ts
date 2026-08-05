import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { signImpersonation } from '$lib/server/_auth/impersonation';
import { COOKIE_IMPERSONATE_NAME } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: tenants } = await locals.adminSrv
    .from('tenants')
    .select('id, name, slug, created_at')
    .order('name');

  return { tenants: tenants ?? [], impersonating: locals.impersonating, impersonatedName: '' };
};

export const actions: Actions = {
  impersonate: async ({ request, cookies, locals }) => {
    const form = await request.formData();
    const tenantId = form.get('tenant_id')?.toString();
    if (!tenantId || !locals.user) return fail(400, { error: 'Invalid impersonation request' });

    const { data: tenant } = await locals.adminSrv
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!tenant) return fail(404, { error: 'Tenant not found' });

    const token = await signImpersonation(tenantId, locals.user.id, request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1');
    cookies.set(COOKIE_IMPERSONATE_NAME, token, { path: '/', maxAge: 60 * 60, httpOnly: true, secure: true, sameSite: 'lax' });
    return { success: true };
  },
  stop: async ({ cookies }) => {
    cookies.delete(COOKIE_IMPERSONATE_NAME, { path: '/' });
    throw redirect(303, '/super-admin/tenants');
  },
};
