import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const { data: tenants } = await locals.srv
    .from('tenants')
    .select('id, name, domain, status, created_at')
    .order('name');

  const impCookie = cookies.get('x-reclass-impersonate');
  let impersonating = false;
  let impersonatedName = '';
  if (impCookie) {
    const { data: t } = await locals.srv
      .from('tenants')
      .select('name')
      .eq('id', impCookie)
      .maybeSingle();
    if (t) {
      impersonating = true;
      impersonatedName = t.name;
    }
  }

  return { tenants: tenants ?? [], impersonating, impersonatedName };
};

export const actions: Actions = {
  impersonate: async ({ request, cookies }) => {
    const form = await request.formData();
    const tenantId = form.get('tenant_id')?.toString();
    if (tenantId) {
      cookies.set('x-reclass-impersonate', tenantId, { path: '/', maxAge: 60 * 60 * 8 });
    }
    return { success: true };
  },
  stop: async ({ cookies }) => {
    cookies.delete('x-reclass-impersonate', { path: '/' });
    throw redirect(303, '/super-admin/tenants');
  },
};
