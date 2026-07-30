import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { signImpersonation } from '$lib/server/_auth/impersonation';

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
    if (tenantId && locals.user) {
      const token = await signImpersonation(tenantId, locals.user.id, request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1');
      cookies.set('x-reclass-impersonate', token, { path: '/', maxAge: 60 * 60, httpOnly: true, sameSite: 'lax' });
    }
    return { success: true };
  },
  stop: async ({ cookies }) => {
    cookies.delete('x-reclass-impersonate', { path: '/' });
    throw redirect(303, '/super-admin/tenants');
  },
};
