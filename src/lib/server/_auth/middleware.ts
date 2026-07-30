import { redirect } from '@sveltejs/kit';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole, type Role } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { verifyImpersonation } from './impersonation';
import { createTenantClient } from '$lib/server/_platform/tenant-client';
import {
  COOKIE_USER_TTL_SECONDS, COOKIE_USER_NAME, COOKIE_IMPERSONATE_NAME,
  ROUTE_LOGIN, ROUTE_NOT_PROVISIONED, PUBLIC_ROUTES, CONTENT_SECURITY_POLICY,
} from '$lib/config';

const REQUIRED_ENV_VARS = [
  [PUBLIC_SUPABASE_URL, 'PUBLIC_SUPABASE_URL', 'Supabase project URL'],
  [PUBLIC_SUPABASE_ANON_KEY, 'PUBLIC_SUPABASE_ANON_KEY', 'Supabase anonymous key'],
  [SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key (bypasses RLS)'],
] as const;

export function validateEnv(): void {
  for (const [value, key, label] of REQUIRED_ENV_VARS) {
    if (!value) {
      throw new Error(`Missing ${key} (${label}). Check your .env file.`);
    }
  }
}

export function initClients(event: Parameters<Handle>[0]['event']): void {
  const { cookies } = event;
  event.locals.supabase = getServerSupabase(cookies);
  event.locals.srv = getServiceClient();
  event.locals.adminSrv = event.locals.srv;
  event.locals.session = null;
  event.locals.user = null;
  event.locals.role = null;
  event.locals.tenantId = '';
  event.locals.impersonating = false;
}

export function bindTenantContext(event: Parameters<Handle>[0]['event']): void {
  if (event.locals.tenantId) {
    event.locals.srv = createTenantClient(event.locals.srv, event.locals.tenantId);
  }
}

export async function resolveSession(event: Parameters<Handle>[0]['event']): Promise<void> {
  let user = null;
  try {
    const { data: { user: u }, error } = await event.locals.supabase.auth.getUser();
    if (!error) user = u;
  } catch (e) {
    if (e instanceof TypeError || e instanceof Error) {
      console.warn('[auth] stale session:', e.message);
    }
  }

  if (!user) {
    event.locals.user = null;
    event.cookies.delete(COOKIE_USER_NAME, { path: '/' });
    return;
  }

  event.locals.user = user;
  event.cookies.set(COOKIE_USER_NAME, JSON.stringify({
    name: user.user_metadata?.full_name ?? user.email ?? 'User',
    email: user.email ?? '',
  }), { maxAge: COOKIE_USER_TTL_SECONDS, path: '/', httpOnly: true, secure: true, sameSite: 'lax' });

  const { data: roleRows } = await event.locals.srv
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);
  const roleRow = roleRows?.[0];
  if (roleRow && isRole(roleRow.role)) {
    event.locals.role = roleRow.role as Role;
    event.locals.tenantId = roleRow.tenant_id;
  }
}

export async function handleImpersonation(event: Parameters<Handle>[0]['event']): Promise<void> {
  if (event.locals.role !== 'super_admin') return;
  const cookie = event.cookies.get(COOKIE_IMPERSONATE_NAME);
  if (!cookie) return;
  const resolved = await verifyImpersonation(cookie, event.getClientAddress());
  if (resolved && resolved !== event.locals.tenantId) {
    event.locals.tenantId = resolved;
    event.locals.impersonating = true;
  }
}

/** Generate a request correlation ID for tracing. */
export function correlationId(event: Parameters<Handle>[0]['event']): void {
  const id = crypto.randomUUID();
  event.locals.requestId = id;
  event.setHeaders({ 'X-Request-Id': id });
}

/** Add security headers to every response. */
export function securityHeaders(event: Parameters<Handle>[0]['event']): void {
  event.setHeaders({
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  });
}

export function routeGuard(event: Parameters<Handle>[0]['event']): void {
  const { pathname } = event.url;
  const { user, role, impersonating } = event.locals;

  if (role && role !== 'super_admin' && !event.locals.tenantId) {
    if (pathname !== ROUTE_NOT_PROVISIONED) {
      redirect(303, ROUTE_NOT_PROVISIONED);
    }
    return;
  }

  if (pathname === '/' || pathname === ROUTE_LOGIN) {
    if (user && role) {
      redirect(303, pathname === '/' ? roleRoutes[role] : '/');
    }
    return;
  }

  if (!user) {
    redirect(303, ROUTE_LOGIN);
  }

  if (!role) {
    redirect(303, ROUTE_LOGIN);
  }

  if (PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return;
  }

  const target = roleRoutes[role];
  const prefix = '/' + pathname.split('/')[1];
  if (prefix !== target && !(role === 'super_admin' && impersonating)) {
    redirect(303, target);
  }
}
