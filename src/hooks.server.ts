import { redirect } from '@sveltejs/kit';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole, type Role } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';

// Validate required env vars at startup
const REQUIRED_ENV_VARS = [
  ['PUBLIC_SUPABASE_URL', 'Supabase project URL'],
  ['PUBLIC_SUPABASE_ANON_KEY', 'Supabase anonymous key'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key (bypasses RLS)'],
] as const;
for (const [key, label] of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} (${label}). Check your .env file.`);
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const cookies = event.cookies;

  const sb = getServerSupabase(cookies);
  event.locals.supabase = sb;
  event.locals.srv = getServiceClient();

  event.locals.session = null;
  event.locals.user = null;
  event.locals.role = null;
  event.locals.tenantId = null;

  let session: import('@supabase/supabase-js').Session | null = null;
  try {
    const { data: { session: s } } = await sb.auth.getSession();
    session = s;
  } catch {
    // stale session cookie — treat as unauthenticated
  }
  event.locals.session = session;

  let user: import('@supabase/supabase-js').User | null = null;
  try {
    const { data: { user: u }, error } = await sb.auth.getUser();
    if (!error) user = u;
  } catch {
    // stale session cookie — treat as unauthenticated
  }

  if (!user) {
    event.locals.user = null;
    cookies.delete('x-reclass-user', { path: '/' });
  } else {
    event.locals.user = user;

    cookies.set('x-reclass-user', JSON.stringify({
      name: user.user_metadata?.full_name ?? user.email ?? 'User',
      email: user.email ?? '',
    }), { maxAge: 300, path: '/' });

    function resolveRole(u: typeof user): Role | null {
      const metaRole = (u?.user_metadata as Record<string, unknown>)?.role;
      if (typeof metaRole === 'string' && isRole(metaRole)) return metaRole;
      return null;
    }

    const cachedRole = resolveRole(user);
    if (cachedRole) {
      event.locals.role = cachedRole;
      const meta = user?.user_metadata as Record<string, unknown> | undefined;
      if (meta?.tenant_id) {
        event.locals.tenantId = meta.tenant_id as string;
      }
    } else {
      const { data: roleRow } = await sb.from('user_roles').select('role, tenant_id').eq('user_id', user.id).maybeSingle();
      if (roleRow) {
        const r = roleRow.role as Role;
        if (isRole(r)) {
          event.locals.role = r;
          event.locals.tenantId = roleRow.tenant_id as string | null;
        }
      }
    }
  }

  if (pathname === '/' || pathname === '/login') {
    if (event.locals.user && event.locals.role) {
      redirect(303, pathname === '/' ? roleRoutes[event.locals.role] : '/');
    }
    return resolve(event);
  }

  if (!event.locals.user) {
    redirect(303, '/login');
  }

  const role = event.locals.role;
  if (!role) {
    redirect(303, '/login');
  }

  const publicPaths = ['/account', '/notifications'];
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return resolve(event);
  }

  const target = roleRoutes[role];

  const prefix = '/' + pathname.split('/')[1];
  if (pathname === '/' || prefix !== target) {
    redirect(303, target);
  }

  return resolve(event);
};
