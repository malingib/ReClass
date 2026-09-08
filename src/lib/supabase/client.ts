import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Database } from './database.types';

const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL ?? '';
const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
