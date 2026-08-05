import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getCommStats, getAnnouncements, getTemplates, getNotificationLog } from '$lib/server/_communications/communications';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [stats, announcements, templates, recentLog] = await Promise.all([
    getCommStats(locals.srv, tenantId),
    getAnnouncements(locals.srv, tenantId),
    getTemplates(locals.srv, tenantId),
    getNotificationLog(locals.srv, tenantId),
  ]);
  return { stats, announcements, templates, recentLog: recentLog.slice(0, 10) };
};
