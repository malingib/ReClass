import { redirect, error } from '@sveltejs/kit';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole, type Role } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { verifyImpersonation } from './impersonation';
import { createTenantClient } from '$lib/server/_platform/tenant-client';
import { moduleForPath } from '$lib/route-modules';
import {
  COOKIE_USER_TTL_SECONDS, COOKIE_USER_NAME, COOKIE_IMPERSONATE_NAME,
  ROUTE_LOGIN, ROUTE_NOT_PROVISIONED, PUBLIC_ROUTES, CONTENT_SECURITY_POLICY,
} from '$lib/config';

const REQUIRED_ENV_VARS = [
  [PUBLIC_SUPABASE_URL, 'PUBLIC_SUPABASE_URL', 'Supabase project URL'],
  [PUBLIC_SUPABASE_ANON_KEY, 'PUBLIC_SUPABASE_ANON_KEY', 'Supabase anonymous key'],
  [SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key (bypasses RLS)'],
] as const;

// ── In-memory cache for user role lookups ────────────────────────────────────
// user_roles changes very rarely (admin action). Caching avoids a DB round-trip
// on every single page navigation — the single biggest per-request cost.
const ROLE_CACHE_TTL_MS = 120_000; // 2 min
const roleCache = new Map<string, { role: string | null; tenantId: string; ts: number }>();

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
  event.locals.enabledModules = null;
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

  // Check role cache first
  const cachedRole = roleCache.get(user.id);
  if (cachedRole && Date.now() - cachedRole.ts < ROLE_CACHE_TTL_MS) {
    if (cachedRole.role && isRole(cachedRole.role)) {
      event.locals.role = cachedRole.role as Role;
      event.locals.tenantId = cachedRole.tenantId;
    }
  } else {
    const { data: roleRows } = await event.locals.supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    const roleRow = roleRows?.[0];
    if (roleRow && isRole(roleRow.role)) {
      event.locals.role = roleRow.role as Role;
      event.locals.tenantId = roleRow.tenant_id;
      roleCache.set(user.id, { role: roleRow.role, tenantId: roleRow.tenant_id, ts: Date.now() });
    } else {
      roleCache.set(user.id, { role: null, tenantId: '', ts: Date.now() });
    }
  }

  // Module provisioning — which modules this tenant may use (null = all).
  if (event.locals.role && event.locals.tenantId) {
    const { getEnabledModules } = await import('$lib/server/_platform/modules');
    try {
      event.locals.enabledModules = await getEnabledModules(
        event.locals.supabase, event.locals.tenantId, event.locals.role,
      );
    } catch {
      error(503, 'Module access is temporarily unavailable. Please try again.');
    }
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
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  };

  // Short-lived Cache-Control for authenticated module pages.
  // Prevents the browser from re-fetching on back/forward navigation
  // while keeping content fresh (private + must-revalidate).
  const { pathname } = event.url;
  if (pathname.startsWith('/admin') || pathname.startsWith('/teacher') ||
      pathname.startsWith('/parent') || pathname.startsWith('/principal') ||
      pathname.startsWith('/bursar')) {
    headers['Cache-Control'] = 'private, max-age=30, stale-while-revalidate=60';
  }

  event.setHeaders(headers);
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

  // Hard 404 for routes of modules not provisioned for this tenant.
  // enabledModules === null → all modules allowed (super_admin / fresh tenant).
  if (event.locals.enabledModules && !impersonating) {
    const mod = moduleForPath(pathname);
    if (mod && mod !== 'platform' && !event.locals.enabledModules.includes(mod)) {
      error(404, 'This module is not enabled for your school.');
    }
  }
}
