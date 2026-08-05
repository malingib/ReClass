import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // role/tenantId are resolved authoritatively in hooks.server.ts from the
  // JWT + user_roles. Source them from locals rather than re-deriving from URL.
  return {
    role: locals.role,
    tenantId: locals.tenantId,
    enabledModules: locals.enabledModules,
  };
};
