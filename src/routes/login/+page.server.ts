import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole } from '$lib/auth';
import type { Role } from '$lib/auth';
import { checkRateLimit, rateLimitedHeaders } from '$lib/server/_platform/rate-limit';
import { normalizePhone } from '$lib/server/_sis/provisioning';
import { TENANT_ID } from '$lib/config';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders(rateLimitedHeaders(await checkRateLimit(getServiceClient(), 'login-page', 'login', { windowMs: 60_000, max: 10 })));
};

async function resolveRoleAndRedirect(userId: string) {
  const { data: roleRows } = await getServiceClient()
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  const roleRow = roleRows?.[0];
  if (!roleRow || !isRole(roleRow.role)) {
    return fail(403, { error: 'Your account is not assigned to any role. Contact your school administrator.' });
  }

  const role = roleRow.role as Role;
  redirect(303, roleRoutes[role]);
}

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

    return resolveRoleAndRedirect(authData.user.id);
  },

  // Parent portal login: National ID (identifier) + phone (password). The
  // phone is validated against the stored parent before the auth sign-in so a
  // stray national ID alone cannot authenticate.
  parentSignIn: async ({ request, cookies, getClientAddress }) => {
    const ip = getClientAddress();
    const rl = await checkRateLimit(getServiceClient(), ip, 'login');
    if (!rl.allowed) {
      return fail(429, { error: 'Too many login attempts. Try again in 60 seconds.' });
    }

    const form = await request.formData();
    const nationalId = String(form.get('national_id') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();

    if (!nationalId || !phone) {
      return fail(400, { error: 'National ID and phone number are required.' });
    }
    const normPhone = normalizePhone(phone);
    if (!/^254\d{9}$/.test(normPhone)) {
      return fail(400, { error: 'Enter a valid phone number (e.g. 07XX XXX XXX).' });
    }

    const final = await getServiceClient()
      .from('parents')
      .select('profile_id, phone, auth_email')
      .eq('tenant_id', TENANT_ID)
      .eq('national_id', nationalId)
      .is('deleted_at', null)
      .maybeSingle();

    const parent = final.data;
    if (!parent?.auth_email || !parent.profile_id) {
      return fail(401, { error: 'No parent portal account matches these details. Ask the school to send your login SMS.' });
    }
    if (normalizePhone(parent.phone ?? '') !== normPhone) {
      return fail(401, { error: 'The National ID and phone number do not match our records.' });
    }

    const supabase = getServerSupabase(cookies);
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: parent.auth_email,
      password: normPhone,
    });
    if (authErr || !authData?.user) {
      return fail(401, { error: 'No parent portal account matches these details. Ask the school to send your login SMS.' });
    }

    return resolveRoleAndRedirect(authData.user.id);
  },
};
