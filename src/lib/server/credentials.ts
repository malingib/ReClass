import { fail } from '@sveltejs/kit';
import { logError } from '$lib/server/log';

const MPESA_KEYS = ['consumer_key', 'consumer_secret', 'passkey', 'shortcode'] as const;

function validateProviderBlob(provider: string, blob: string): string | null {
  try {
    const parsed = JSON.parse(blob);
    if (typeof parsed !== 'object' || parsed === null) return 'Credentials must be a JSON object';
    if (provider === 'mpesa') {
      for (const key of MPESA_KEYS) {
        if (!parsed[key] || typeof parsed[key] !== 'string') return `Missing or invalid field: ${key}`;
      }
    } else if (provider === 'mobiwave_sms') {
      if (!parsed.api_token || typeof parsed.api_token !== 'string') return 'Missing or invalid field: api_token';
    }
    return null;
  } catch {
    return 'Credentials must be valid JSON';
  }
}

export async function getCredentials(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('credentials')
    .select('id, label, provider, environment, test_status, is_active, created_at, updated_at')
    .eq('scope', 'tenant')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function saveCredential(
  sb: App.Locals['srv'],
  tenantId: string,
  formData: { id?: string; provider: string; environment: string; label: string; encrypted_blob: string },
) {
  const { id, provider, environment, label, encrypted_blob } = formData;

  if (!provider || !encrypted_blob) {
    return fail(400, { error: 'Provider and credentials are required' });
  }

  const validationError = validateProviderBlob(provider, encrypted_blob);
  if (validationError) {
    return fail(400, { error: validationError });
  }

  // Encrypt the blob server-side before storing
  const { data: encrypted, error: encError } = await sb.rpc('encrypt_credential', {
    p_json: JSON.parse(encrypted_blob),
  });
  if (encError || !encrypted) {
    logError('credential_encrypt', encError ?? new Error('encryption returned null'));
    return fail(500, { error: 'Failed to encrypt credential. Please try again.' });
  }

  const payload = {
    tenant_id: tenantId,
    scope: 'tenant' as const,
    purpose: 'school_send' as const,
    provider: provider === 'mpesa' ? 'mpesa' as const : 'mobiwave_sms' as const,
    environment: (environment === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
    label: label || provider,
    encrypted_blob: encrypted,
    is_active: true,
    test_status: 'untested' as const,
  };

  if (id) {
    const { error } = await sb
      .from('credentials')
      .update(payload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('scope', 'tenant');

    if (error) {
      logError('credential_update', error, { id });
      return fail(500, { error: 'Failed to update credential. Please try again.' });
    }
  } else {
    const { error } = await sb
      .from('credentials')
      .insert(payload);

    if (error) {
      logError('credential_insert', error);
      if (error.code === '23505') {
        return fail(409, { error: 'A credential for this provider and environment already exists.' });
      }
      return fail(500, { error: 'Failed to save credential. Please try again.' });
    }
  }

  return { success: true as const };
}

export async function deleteCredential(sb: App.Locals['srv'], tenantId: string, id: string) {
  if (!id) return fail(400, { error: 'Credential ID is required' });

  const { error } = await sb
    .from('credentials')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('scope', 'tenant');

  if (error) {
    logError('credential_delete', error, { id });
    return fail(500, { error: 'Failed to delete credential.' });
  }

  return { success: true as const };
}

export async function testCredential(sb: App.Locals['srv'], tenantId: string, id: string) {
  if (!id) return fail(400, { error: 'Credential ID is required' });

  const { data: credential } = await sb
    .from('credentials')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('scope', 'tenant')
    .maybeSingle();
  if (!credential) return fail(404, { error: 'Credential not found' });

  await sb
    .from('credentials')
    .update({ test_status: 'untested' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('scope', 'tenant');

  const { data: result, error: fnError } = await sb.functions.invoke('credentials-test', {
    body: { credential_id: id },
  });

  if (fnError) {
    await sb
      .from('credentials')
      .update({ test_status: 'failed', last_tested_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('scope', 'tenant');
    return fail(500, { error: `Test failed: ${fnError.message}` });
  }

  const ok = result?.ok === true;
  await sb
    .from('credentials')
    .update({
      test_status: ok ? 'ok' : 'failed',
      last_tested_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('scope', 'tenant');

  return {
    success: true as const,
    testResult: ok ? 'ok' : 'failed',
    message: result?.message ?? (ok ? 'Credential verified successfully' : 'Credential verification failed'),
  };
}
