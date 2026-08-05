import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/_auth/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
  requireRole(locals, 'super_admin');
  return {};
};
