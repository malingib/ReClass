// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const userSchema = z.object({
  id: z.string().optional(),
  user_id: z.string().min(1, 'User is required'),
  role: z.enum(['school_admin', 'principal', 'teacher', 'bursar', 'parent']),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(userSchema));
  const db = locals.srv;

  // Get all user_roles with profile info
  let q = db
    .from('user_roles')
    .select('id, user_id, role, profiles!inner(id, full_name, email)')
    .order('role');
  if (locals.tenantId) q = q.eq('tenant_id', locals.tenantId);
  const { data: users } = await q;

  // Get available profiles (users without a role yet, for the create form)
  let profileQ = db
    .from('profiles')
    .select('id, full_name, email');
  if (locals.tenantId) profileQ = profileQ.eq('tenant_id', locals.tenantId);
  const { data: allProfiles } = await profileQ;

  // Filter profiles that already have a role
  const userIdsWithRoles = new Set((users ?? []).map(u => u.user_id));
  const availableProfiles = (allProfiles ?? []).filter(p => !userIdsWithRoles.has(p.id));

  return {
    form,
    users: users ?? [],
    availableProfiles: availableProfiles,
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(userSchema));
    if (!form.valid) return fail(400, { form });
    if (!locals.tenantId) return message(form, 'Tenant not found', { status: 500 });

    const { error } = await locals.srv.from('user_roles').insert({
      tenant_id: locals.tenantId,
      user_id: form.data.user_id,
      role: form.data.role,
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'User role assigned successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(userSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });

    const { error } = await locals.srv.from('user_roles')
      .update({ role: form.data.role })
      .eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'User role updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('user_roles').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'User role removed successfully');
  },
} satisfies Actions;
