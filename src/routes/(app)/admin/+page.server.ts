import type { PageServerLoad } from './$types';

/**
 * The admin landing page is the school operations home. Modules remain available
 * from the dedicated module hub, but the default journey starts with work to do.
 */
export const load: PageServerLoad = async () => ({
  lastUpdated: new Date().toISOString(),
});
