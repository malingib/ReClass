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
  phone: z.string().max(20).optional(),
  id_number: z.string().max(30).optional(),
  teacher_type: z.enum(['remedial', 'classroom', 'both']),
  remedial_role: z.enum(['chairman', 'treasurer', 'member', 'none']).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const { data: teachers } = await locals.srv
    .from('teachers')
    .select('id, first_name, last_name, employee_no, subjects, phone, id_number, teacher_type, remedial_role')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('first_name');

  return { teachers: teachers ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(teacherSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const subjects = v.data.subjects ? v.data.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
    const { error } = await locals.srv.from('teachers').insert({
      tenant_id: tenantId,
      first_name: v.data.first_name,
      last_name: v.data.last_name,
      employee_no: v.data.employee_no || null,
      subjects: subjects.length > 0 ? subjects : null,
      phone: v.data.phone || null,
      id_number: v.data.id_number || null,
      teacher_type: v.data.teacher_type,
      remedial_role: v.data.remedial_role || 'none',
    });
    if (error) return fail(500, { message: 'Failed to save teacher' });
    return { success: true, message: 'Teacher created successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(teacherSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });
    const subjects = v.data.subjects ? v.data.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
    const { error } = await locals.srv.from('teachers')
      .update({
        first_name: v.data.first_name,
        last_name: v.data.last_name,
        employee_no: v.data.employee_no || null,
        subjects: subjects.length > 0 ? subjects : null,
        phone: v.data.phone || null,
        id_number: v.data.id_number || null,
        teacher_type: v.data.teacher_type,
        remedial_role: v.data.remedial_role || 'none',
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: 'Failed to save teacher' });
    return { success: true, message: 'Teacher updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(deleteSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('teachers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);
    if (error) return fail(500, { message: 'Failed to delete teacher' });
    return { success: true, message: 'Teacher deleted successfully' };
  },
} satisfies Actions;