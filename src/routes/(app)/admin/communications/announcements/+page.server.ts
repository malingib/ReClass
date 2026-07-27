import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getAnnouncements } from '$lib/server/communications';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const announcements = await getAnnouncements(locals.srv, tenantId);
  return { announcements };
};
