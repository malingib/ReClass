import { fail } from '@sveltejs/kit';
import { logError } from './log';

/**
 * Platform config — secrets owned by the platform admin (super_admin), stored
 * encrypted in `platform_config` and read by edge functions at call time.
 * Never tenant-scoped and never exposed to tenant users.
 */
export const PLATFORM_CONFIG_KEYS = ['mpesa_callback_secret', 'public_url', 'app_url'] as const;
export type PlatformConfigKey = (typeof PLATFORM_CONFIG_KEYS)[number];

export async function getPlatformConfig(sb: App.Locals['srv']): Promise<Record<string, string>> {
  const { data, error } = await sb.rpc('get_platform_config');
  if (error) {
    logError('platform_config_get', error);
    return {};
  }
  const value = (data ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export async function setPlatformConfig(
  sb: App.Locals['srv'],
  key: string,
  value: string,
  updatedBy?: string,
) {
  if (!PLATFORM_CONFIG_KEYS.includes(key as PlatformConfigKey)) {
    return fail(400, { error: `Unsupported platform config key: ${key}` });
  }
  if (value === undefined || value === null || value === '') {
    return fail(400, { error: 'A value is required.' });
  }
  const { data, error } = await sb.rpc('set_platform_config', {
    p_key: key,
    p_value: value,
    p_updated_by: updatedBy ?? null,
  });
  if (error) {
    logError('platform_config_set', error, { key });
    return fail(500, { error: 'Failed to save platform config. Please try again.' });
  }
  if ((data as { status?: string } | null)?.status !== 'ok') {
    return fail(400, { error: 'Platform config save was rejected.' });
  }
  return { success: true as const, key };
}
