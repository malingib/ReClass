import type { LayoutServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');
  return {};
};
