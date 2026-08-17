import type { PageServerLoad } from './$types';
import { getReclassStats } from '$lib/server/_remedial/dashboard';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const result = await getReclassStats(locals.srv, tenantId);
  return result;
};
