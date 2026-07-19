import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { logError } from '$lib/server/log';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const sb = locals.srv;

  const { data: credentials } = await sb
    .from('credentials')
    .select('id, label, provider, environment, test_status, is_active, created_at, updated_at')
    .eq('scope', 'tenant')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return { credentials: credentials ?? [] };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const sb = locals.srv;
    const form = await request.formData();

    const id = form.get('id') as string;
    const provider = form.get('provider') as string;
    const environment = form.get('environment') as string;
    const label = form.get('label') as string;
    const encrypted_blob = form.get('encrypted_blob') as string;

    if (!provider || !encrypted_blob) {
      return fail(400, { error: 'Provider and credentials are required' });
    }

    const payload = {
      tenant_id: tenantId,
      scope: 'tenant' as const,
      purpose: 'school_send' as const,
      provider: provider === 'mpesa' ? 'mpesa' as const : 'mobiwave_sms' as const,
      environment: (environment === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
      label: label || provider,
      encrypted_blob,
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

    return { success: true };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const sb = locals.srv;
    const form = await request.formData();
    const id = form.get('id') as string;

    if (!id) {
      return fail(400, { error: 'Credential ID is required' });
    }

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

    return { success: true };
  },

  test: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const sb = locals.srv;
    const form = await request.formData();
    const id = form.get('id') as string;

    if (!id) {
      return fail(400, { error: 'Credential ID is required' });
    }

    const { data: credential } = await sb
      .from('credentials')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('scope', 'tenant')
      .maybeSingle();
    if (!credential) return fail(404, { error: 'Credential not found' });

    // Mark as testing
    await sb
      .from('credentials')
      .update({ test_status: 'untested' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('scope', 'tenant');

    // Invoke the credentials-test Edge Function
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
      success: true,
      testResult: ok ? 'ok' : 'failed',
      message: result?.message ?? (ok ? 'Credential verified successfully' : 'Credential verification failed'),
    };
  },
};
