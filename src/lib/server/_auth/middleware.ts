import { redirect } from '@sveltejs/kit';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole, type Role } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import {
  COOKIE_USER_TTL_SECONDS, COOKIE_USER_NAME, COOKIE_ROLE_NAME,
  ROUTE_LOGIN, PUBLIC_ROUTES, CONTENT_SECURITY_POLICY, TENANT_ID,
} from '$lib/config';

const REQUIRED_ENV_VARS = [
  [PUBLIC_SUPABASE_URL, 'PUBLIC_SUPABASE_URL', 'Supabase project URL'],
  [PUBLIC_SUPABASE_ANON_KEY, 'PUBLIC_SUPABASE_ANON_KEY', 'Supabase anonymous key'],
  [SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key (bypasses RLS)'],
] as const;

// ── In-memory cache for user role lookups ────────────────────────────────────
// user_roles changes very rarely (admin action). Caching avoids a DB round-trip
// on every single page navigation — the single biggest per-request cost.
// The cache holds the FULL role set per user (multi-role users can switch); the
// active role is chosen from the cookie on top of the cached list.
const ROLE_CACHE_TTL_MS = 120_000; // 2 min
const roleCache = new Map<string, { rows: Role[]; ts: number }>();

/** Drop a user's cached role set (e.g. after an active-role switch). */
export function invalidateRoleCache(userId: string): void {
  roleCache.delete(userId);
}

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
  event.locals.roles = null;
  event.locals.tenantId = TENANT_ID;
}

export async function resolveSession(event: Parameters<Handle>[0]['event']): Promise<void> {
  let user = null;
  try {
    const { data: { user: u }, error } = await event.locals.supabase.auth.getUser();
    if (!error && u) user = u;
  } catch (e) {
    if (e instanceof TypeError || e instanceof Error) {
      console.warn('[auth] stale session:', e.message);
    }
    // Treat any error as no user to ensure stale sessions are cleared
    user = null;
  }

  if (!user) {
    event.locals.user = null;
    event.cookies.delete(COOKIE_USER_NAME, { path: '/' });
    event.cookies.delete(COOKIE_ROLE_NAME, { path: '/' });
    // Also clear Supabase auth session cookie if present
    event.locals.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        event.locals.supabase.auth.signOut();
      }
    }).catch(() => {
      // Ignore errors during cleanup
    });
    return;
  }

  event.locals.user = user;
  event.cookies.set(COOKIE_USER_NAME, JSON.stringify({
    name: user.user_metadata?.full_name ?? user.email ?? 'User',
    email: user.email ?? '',
  }), { maxAge: COOKIE_USER_TTL_SECONDS, path: '/', httpOnly: true, secure: true, sameSite: 'lax' });

  // Resolve the user's FULL role set — multi-role users pick the active one via
  // the role cookie, defaulting to their earliest-assigned role (created_at asc)
  // so users who never touched the switcher behave exactly as before.
  const cookieRole = event.cookies.get(COOKIE_ROLE_NAME);
  const cached = roleCache.get(user.id);
  let rows: Role[];
  if (cached && Date.now() - cached.ts < ROLE_CACHE_TTL_MS) {
    rows = cached.rows;
  } else {
    const { data: roleRows } = await event.locals.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    rows = (roleRows ?? [])
      .map((r: { role: string }) => r.role)
      .filter((r): r is Role => isRole(r));
    roleCache.set(user.id, { rows, ts: Date.now() });
  }

  event.locals.roles = rows;
  event.locals.role = cookieRole && rows.includes(cookieRole as Role)
    ? (cookieRole as Role)
    : rows[0] ?? null;
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
  const { user, role } = event.locals;

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
  if (prefix !== target) {
    redirect(303, target);
  }
}
