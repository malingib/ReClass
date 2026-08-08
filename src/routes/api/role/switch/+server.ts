import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { roleRoutes, isRole } from '$lib/auth';
import { COOKIE_ROLE_NAME } from '$lib/config';
import { invalidateRoleCache } from '$lib/server/_auth/middleware';

const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year (re-validated each request)

/**
 * Active-role switch. user_roles is the source of truth: the switcher may only
 * select a role this user actually holds (RLS restricts the query to the
 * caller's own rows). The chosen role is persisted in a cookie and the role
 * cache dropped so the next request re-resolves role + tenantId from it.
 */
export const POST: RequestHandler = async ({ locals, request, cookies }) => {
  if (!locals.user) error(401, 'Authentication required');

  const form = await request.formData();
  const next = form.get('role')?.toString() ?? '';

  const { data: roleRows } = await locals.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', locals.user.id);
  const held = (roleRows ?? []).map((r: { role: string }) => r.role).filter(isRole);
  if (!next || !isRole(next) || !held.includes(next)) {
    error(400, 'Invalid role');
  }

  cookies.set(COOKIE_ROLE_NAME, next, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: ROLE_COOKIE_MAX_AGE,
  });
  invalidateRoleCache(locals.user.id);
  redirect(303, roleRoutes[next]);
};
