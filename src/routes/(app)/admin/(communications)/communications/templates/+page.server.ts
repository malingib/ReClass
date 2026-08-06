import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  channel: z.enum(['sms', 'email', 'both']).default('sms'),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Message body is required'),
  variables: z.string().max(500).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const { data } = await locals.srv
    .from('comm_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  return { templates: data ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(templateSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });

    const { error } = await locals.srv.from('comm_templates').insert({
      tenant_id: tenantId,
      name: v.data.name,
      channel: v.data.channel,
      subject: v.data.subject || null,
      body: v.data.body,
      variables: v.data.variables ? v.data.variables.split(',').map(s => s.trim()).filter(Boolean) : [],
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Template created' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(templateSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const { error } = await locals.srv.from('comm_templates')
      .update({
        name: v.data.name,
        channel: v.data.channel,
        subject: v.data.subject || null,
        body: v.data.body,
        variables: v.data.variables ? v.data.variables.split(',').map(s => s.trim()).filter(Boolean) : [],
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Template updated' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(deleteSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('comm_templates')
      .delete()
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Template deleted' };
  },
} satisfies Actions;
