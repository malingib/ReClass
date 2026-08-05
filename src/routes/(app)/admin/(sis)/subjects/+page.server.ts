import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  code: z.string().max(50).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const { data: subjects } = await locals.srv
    .from('subjects')
    .select('id, name, code')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name');

  return { subjects: subjects ?? [] };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(subjectSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('subjects').insert({
      tenant_id: tenantId,
      name: v.data.name,
      code: v.data.code || null,
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Subject created successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(subjectSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });
    const { error } = await locals.srv.from('subjects')
      .update({ name: v.data.name, code: v.data.code || null })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Subject updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('subjects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Subject deleted successfully' };
  },
};
