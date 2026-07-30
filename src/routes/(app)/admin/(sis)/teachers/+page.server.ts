import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const teacherSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  employee_no: z.string().max(50).optional(),
  subjects: z.string().max(500).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const sb = locals.srv;

  const { data: teachers } = await sb
    .from('teachers')
    .select('id, first_name, last_name, employee_no, subjects')
    .eq('tenant_id', tenantId)
    .order('first_name');

  return { teachers: teachers ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(teacherSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const subjects = v.data.subjects ? v.data.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
    const { error } = await locals.srv.from('teachers').insert({
      tenant_id: tenantId,
      first_name: v.data.first_name,
      last_name: v.data.last_name,
      employee_no: v.data.employee_no || null,
      subjects: subjects.length > 0 ? subjects : null,
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Teacher created successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(teacherSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });
    const subjects = v.data.subjects ? v.data.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
    const { error } = await locals.srv.from('teachers')
      .update({
        first_name: v.data.first_name,
        last_name: v.data.last_name,
        employee_no: v.data.employee_no || null,
        subjects: subjects.length > 0 ? subjects : null,
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Teacher updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('teachers')
      .delete()
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Teacher deleted successfully' };
  },
} satisfies Actions;
