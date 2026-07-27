import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole } from '$lib/auth';
import type { Role } from '$lib/auth';
import { checkRateLimit, rateLimitedHeaders } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders(rateLimitedHeaders(await checkRateLimit(getServiceClient(), 'login-page', 'login', { windowMs: 60_000, max: 10 })));
};

export const actions: Actions = {
  signIn: async ({ request, cookies, getClientAddress }) => {
    const ip = getClientAddress();
    const rl = await checkRateLimit(getServiceClient(), ip, 'login');
    if (!rl.allowed) {
      return fail(429, { error: 'Too many login attempts. Try again in 60 seconds.' });
    }

    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.' });
    }

    const supabase = getServerSupabase(cookies);
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !authData?.user) {
      return fail(401, { error: 'Invalid email or password.' });
    }

    const { data: roleRows } = await getServiceClient()
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    const roleRow = roleRows?.[0];
    if (!roleRow || !isRole(roleRow.role)) {
      return fail(403, { error: 'Your account is not assigned to any role. Contact your school administrator.' });
    }

    const role = roleRow.role as Role;
    redirect(303, roleRoutes[role]);
  },
};
