import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getSisAdmissions } from '$lib/server/sis';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const admissions = await getSisAdmissions(locals.srv, tenantId);
  return { admissions };
};
