import type { PageServerLoad } from './$types';
import { getAdminDashboardStats } from '$lib/server/_dashboard/admin-dashboard';

export const load: PageServerLoad = async ({ locals }) => {
  return getAdminDashboardStats(locals.srv, locals.tenantId);
};
