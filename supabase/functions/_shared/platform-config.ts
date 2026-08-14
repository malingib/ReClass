import { getServiceClient } from './supabase.ts';

/**
 * Platform config lookup shared by edge functions.
 *
 * Reads operator-managed settings (e.g. mpesa_callback_secret, public_url)
 * from the `platform_config` table (encrypted at rest, set by the platform
 * admin in the super-admin dashboard). Falls back to Deno env vars so
 * environments that have not yet been migrated to DB-backed config keep
 * working, and env always wins when present (explicit > DB).
 */
export async function getPlatformConfig(
  sb: ReturnType<typeof getServiceClient>,
  keys: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  // 1. Env vars are the source of truth when present.
  for (const key of keys) {
    const envName = key.toUpperCase();
    const envVal = Deno.env.get(envName);
    if (envVal) out[key] = envVal;
  }

  // 2. Fill any gaps from the DB config (encrypted at rest).
  const missing = keys.filter(k => !(k in out));
  if (missing.length === 0) return out;

  try {
    const { data, error } = await sb.rpc('get_platform_config');
    if (!error && data && typeof data === 'object') {
      for (const key of missing) {
        const val = (data as Record<string, unknown>)[key];
        if (typeof val === 'string' && val.length > 0) out[key] = val;
      }
    } else if (error) {
      console.error(`getPlatformConfig: rpc failed: ${error.message}`);
    }
  } catch (err) {
    console.error('getPlatformConfig: unexpected error', err);
  }

  return out;
}
