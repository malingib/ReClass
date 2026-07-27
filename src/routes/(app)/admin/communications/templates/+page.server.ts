import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getTemplates } from '$lib/server/communications';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const templates = await getTemplates(locals.srv, tenantId);
  return { templates };
};
