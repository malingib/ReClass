import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Database } from './database.types';

// SvelteKit's dev-mode SSR replaces `globalThis.fetch` for the duration of a
// page render and warns when any fetch happens inside that window. The window
// can span many seconds (cold module compilation, HMR/SSR page reloads), and
// supabase-js resolves the global fetch at *call time* — so middleware/load
// queries from concurrent requests can land in another request's render window
// and trigger the spurious "Avoid calling `fetch` eagerly during server-side
// rendering" dev warning. Capturing the fetch at module scope keeps Supabase
// calls on a stable reference: in dev it is SvelteKit's own fetch wrapper
// (which only guards relative URLs), in production it is the plain global
// fetch — no behavior change.
const STABLE_FETCH: typeof fetch = globalThis.fetch.bind(globalThis);

export function getServerSupabase(cookies: Cookies) {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: { fetch: STABLE_FETCH },
    cookies: {
      getAll() { return cookies.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}

/** Service-role client that bypasses RLS. For server-side data queries only. */
export function getServiceClient() {
  return createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: STABLE_FETCH },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
