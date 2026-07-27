import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { parseForm } from '$lib/client/validation';

const userSchema = z.object({
  id: z.string().optional(),
  user_id: z.string().min(1, 'User is required').max(100),
  role: z.enum(['school_admin', 'principal', 'teacher', 'bursar', 'parent']),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const db = locals.srv;

  const { data: users } = await db
    .from('user_roles')
    .select('id, user_id, role, profiles!inner(id, full_name)')
    .eq('tenant_id', tenantId)
    .order('role');

  const { data: allProfiles } = await db
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', tenantId);

  const userIdsWithRoles = new Set((users ?? []).map(u => u.user_id));
  const availableProfiles = (allProfiles ?? []).filter(p => !userIdsWithRoles.has(p.id));

  return {
    users: users ?? [],
    availableProfiles,
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(userSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { data: profile } = await locals.srv.from('profiles').select('id').eq('id', v.data.user_id).eq('tenant_id', tenantId).maybeSingle();
    if (!profile) return fail(404, { message: 'User not found in this school' });
    const { error } = await locals.srv.from('user_roles').insert({
      tenant_id: tenantId,
      user_id: v.data.user_id,
      role: v.data.role,
    });
    if (error) {
      if (error.code === '23505') return fail(409, { message: 'This user already has this role assigned.' });
      return fail(500, { message: `Failed: ${error.message}` });
    }
    return { success: true, message: 'User role assigned successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(userSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const { error } = await locals.srv.from('user_roles')
      .update({ role: v.data.role })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'User role updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('user_roles').delete().eq('id', v.data.id).eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'User role removed successfully' };
  },
} satisfies Actions;
