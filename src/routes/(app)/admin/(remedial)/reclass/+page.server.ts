import type { PageServerLoad } from './$types';
import { getReclassStats } from '$lib/server/_remedial/dashboard';

export const load: PageServerLoad = async ({ locals }) => {
  const result = await getReclassStats(locals.srv, locals.tenantId);
  return result;
};
