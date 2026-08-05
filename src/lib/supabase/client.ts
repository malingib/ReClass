import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
