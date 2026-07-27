import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getCredentials, saveCredential, deleteCredential, testCredential } from '$lib/server/credentials';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  return { credentials: await getCredentials(locals.srv, tenantId) };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    return saveCredential(locals.srv, tenantId, {
      id: String(form.get('id') ?? ''),
      provider: String(form.get('provider') ?? ''),
      environment: String(form.get('environment') ?? ''),
      label: String(form.get('label') ?? ''),
      encrypted_blob: String(form.get('encrypted_blob') ?? ''),
    });
  },
  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    return deleteCredential(locals.srv, tenantId, String(form.get('id') ?? ''));
  },
  test: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    return testCredential(locals.srv, tenantId, String(form.get('id') ?? ''));
  },
};
