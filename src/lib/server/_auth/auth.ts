import { error } from '@sveltejs/kit';
import type { Role } from '$lib/auth';

export function requireUser(locals: App.Locals) {
  if (!locals.user) error(401, 'Authentication required');
  return locals.user;
}

export function requireTenant(locals: App.Locals): string {
  if (!locals.tenantId) error(403, 'School tenant required');
  return locals.tenantId;
}

export function requireRole(locals: App.Locals, ...roles: Role[]): Role {
  if (!locals.role || !roles.includes(locals.role)) {
    error(403, 'You do not have permission to perform this action');
  }
  return locals.role;
}

export function requireTenantRole(locals: App.Locals, ...roles: Role[]) {
  return {
    user: requireUser(locals),
    tenantId: requireTenant(locals),
    role: requireRole(locals, ...roles),
  };
}
