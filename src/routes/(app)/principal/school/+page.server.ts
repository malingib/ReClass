import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getSisStats, getSisClasses, getSisEnrollments } from '$lib/server/_sis/sis';
import { PAGE_LIST_MEDIUM } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'principal');

  const [{ data: students }, stats, classes, enrollments] = await Promise.all([
    locals.srv
      .from('students')
      .select('id, admission_no, first_name, last_name, grade, status')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('first_name')
      .limit(PAGE_LIST_MEDIUM),
    getSisStats(locals.srv, tenantId),
    getSisClasses(locals.srv, tenantId),
    getSisEnrollments(locals.srv, tenantId),
  ]);

  return {
    stats,
    students: students ?? [],
    classes,
    enrollments: enrollments.slice(0, PAGE_LIST_MEDIUM),
  };
};
