import type { LayoutServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'teacher');
  return {};
};
