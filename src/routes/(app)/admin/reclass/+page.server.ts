import type { PageServerLoad } from './$types';
import { getReclassStats } from '$lib/server/dashboard';

export const load: PageServerLoad = async ({ locals }) => {
  return getReclassStats(locals.srv, locals.tenantId);
};
