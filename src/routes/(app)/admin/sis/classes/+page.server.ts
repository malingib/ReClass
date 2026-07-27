import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getSisClasses } from '$lib/server/sis';
import { getTeachersList } from '$lib/server/teacher-invoices';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [classes, teachers] = await Promise.all([
    getSisClasses(locals.srv, tenantId),
    getTeachersList(locals.srv, tenantId),
  ]);
  return { classes, teachers };
};
