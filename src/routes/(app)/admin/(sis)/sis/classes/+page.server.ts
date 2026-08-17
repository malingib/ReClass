import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getSisClasses } from '$lib/server/_sis/sis';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [classes, teacherCount] = await Promise.all([
    getSisClasses(locals.srv, tenantId),
    countRecord(locals.srv, tenantId),
  ]);
  return { classes, teacherCount };
};

async function countRecord(sb: App.Locals['srv'], tenantId: string) {
  const { count } = await sb.from('teachers').select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).is('deleted_at', null);
  return count ?? 0;
}
