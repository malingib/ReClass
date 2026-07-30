import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getSisStats, getSisClasses, getSisAdmissions } from '$lib/server/_sis/sis';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [stats, classes, recentAdmissions] = await Promise.all([
    getSisStats(locals.srv, tenantId),
    getSisClasses(locals.srv, tenantId),
    getSisAdmissions(locals.srv, tenantId),
  ]);
  return { stats, classes, recentAdmissions: recentAdmissions.slice(0, 10) };
};
