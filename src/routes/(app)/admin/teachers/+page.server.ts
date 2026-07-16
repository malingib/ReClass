// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const teacherSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  employee_no: z.string().optional(),
  subjects: z.string().optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(teacherSchema));
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: teachers } = await sb
    .from('teachers')
    .select('id, first_name, last_name, employee_no, subjects')
    .eq('tenant_id', tid)
    .order('first_name');

  return { form, teachers: teachers ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(teacherSchema));
    if (!form.valid) return fail(400, { form });
    const subjects = form.data.subjects ? form.data.subjects.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const { error } = await locals.srv.from('teachers').insert({
      tenant_id: locals.tenantId,
      first_name: form.data.first_name,
      last_name: form.data.last_name,
      employee_no: form.data.employee_no || null,
      subjects: subjects.length > 0 ? subjects : null,
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Teacher created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(teacherSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const subjects = form.data.subjects ? form.data.subjects.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const { error } = await locals.srv.from('teachers')
      .update({
        first_name: form.data.first_name,
        last_name: form.data.last_name,
        employee_no: form.data.employee_no || null,
        subjects: subjects.length > 0 ? subjects : null,
      })
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Teacher updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('teachers')
      .delete()
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Teacher deleted successfully');
  },
} satisfies Actions;
