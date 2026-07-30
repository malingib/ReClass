import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getSchedules, createSession, softDeleteSession, toggleSessionActive } from '$lib/server/_remedial/scheduling';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  return getSchedules(locals.srv, tenantId);
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    return createSession(locals.srv, tenantId, Object.fromEntries(form));
  },
  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    return softDeleteSession(locals.srv, tenantId, form.get('id')?.toString() ?? '');
  },
  toggle: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    return toggleSessionActive(locals.srv, tenantId, form.get('id')?.toString() ?? '', form.get('active') === 'true');
  },
} satisfies Actions;
