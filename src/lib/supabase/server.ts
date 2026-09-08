import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Database } from './database.types';

const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL ?? '';
const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const STABLE_FETCH: typeof fetch = globalThis.fetch.bind(globalThis);

export function getServerSupabase(cookies: Cookies) {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: { fetch: STABLE_FETCH },
    cookies: {
      getAll() { return cookies.getAll(); },
      setAll(cookiesToSet) { for (const { name, value, options } of cookiesToSet) cookies.set(name, value, options); },
    },
  });
}

export function getServiceClient() {
  return createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: STABLE_FETCH },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
