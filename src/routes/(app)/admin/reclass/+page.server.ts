import type { PageServerLoad } from './$types';
import { getAdminDashboardStats } from '$lib/server/dashboard';

export const load: PageServerLoad = async ({ locals }) => {
  return getAdminDashboardStats(locals.srv, locals.tenantId);
};
