import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getWaiversAndInvoices, createWaiver } from '$lib/server/waivers';

export const load: PageServerLoad = async ({ locals }) => {
  return getWaiversAndInvoices(locals.srv, locals.tenantId);
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'bursar');
    const form = await request.formData();
    return createWaiver(locals.srv, tenantId, user.id, {
      invoice_id: String(form.get('invoice_id') ?? ''),
      amount: parseFloat(String(form.get('amount') ?? '0')),
      reason: String(form.get('reason') ?? ''),
    });
  },
};
