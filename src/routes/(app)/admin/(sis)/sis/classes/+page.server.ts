import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getSisClasses } from '$lib/server/_sis/sis';
import { getTeachersList } from '$lib/server/_finance/teacher-invoices';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [classes, teachers] = await Promise.all([
    getSisClasses(locals.srv, tenantId),
    getTeachersList(locals.srv, tenantId),
  ]);
  return { classes, teachers };
};
