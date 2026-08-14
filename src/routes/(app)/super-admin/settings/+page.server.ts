import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { logError } from '$lib/server/_platform/log';
import {
  PLATFORM_CONFIG_KEYS,
  getPlatformConfig,
  setPlatformConfig,
} from '$lib/server/_platform/platform';
import {
  getPlatformCredentials,
  savePlatformCredential,
  deletePlatformCredential,
  testPlatformCredential,
} from '$lib/server/_platform/credentials';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.srv;
  const config = await getPlatformConfig(sb);
  const credentials = await getPlatformCredentials(sb);
  return {
    config,
    configuredKeys: Object.keys(config),
    credentials,
  };
};

export const actions: Actions = {
  'config-set': async ({ locals, request }) => {
    const fd = await request.formData();
    const key = String(fd.get('key') ?? '');
    const value = String(fd.get('value') ?? '');
    return setPlatformConfig(locals.srv, key, value, locals.user?.id);
  },

  'config-remove': async ({ locals, request }) => {
    const fd = await request.formData();
    const key = String(fd.get('key') ?? '');
    if (!PLATFORM_CONFIG_KEYS.includes(key as (typeof PLATFORM_CONFIG_KEYS)[number])) {
      return fail(400, { error: `Unsupported platform config key: ${key}` });
    }
    const { error } = await locals.srv
      .from('platform_config')
      .delete()
      .eq('key', key);
    if (error) {
      logError('platform_config_remove', error, { key });
      return fail(500, { error: 'Failed to remove platform config.' });
    }
    return { success: true as const, key };
  },

  'credential-save': async ({ locals, request }) => {
    const fd = await request.formData();
    return savePlatformCredential(locals.srv, {
      id: String(fd.get('id') ?? ''),
      provider: String(fd.get('provider') ?? ''),
      environment: String(fd.get('environment') ?? ''),
      label: String(fd.get('label') ?? ''),
      encrypted_blob: String(fd.get('encrypted_blob') ?? ''),
    });
  },

  'credential-delete': async ({ locals, request }) => {
    const fd = await request.formData();
    return deletePlatformCredential(locals.srv, String(fd.get('id') ?? ''));
  },

  'credential-test': async ({ locals, request }) => {
    const fd = await request.formData();
    return testPlatformCredential(locals.srv, String(fd.get('id') ?? ''));
  },
};