import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function requireEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

/** Singleton service-role client (reads env once). */
let _serviceClient: ReturnType<typeof createClient> | null = null;
export function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }
  return _serviceClient;
}

/** Create an authenticated client from a Bearer token string (no 'Bearer ' prefix needed). */
export function getUserClient(token: string) {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}
