// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const studentSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  admission_no: z.string().min(1, 'Admission no is required'),
  grade: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(studentSchema));
  const db = locals.srv;
  const q = db.from('students')
    .select('id, admission_no, first_name, last_name, grade, status, created_at')
    .order('created_at', { ascending: false });
  if (locals.tenantId) {
    q.eq('tenant_id', locals.tenantId);
  }
  const { data: students } = await q;

  return { form, students: students ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(studentSchema));
    if (!form.valid) return fail(400, { form });
    if (!locals.tenantId) return message(form, 'Tenant not found', { status: 500 });

    const { error } = await locals.srv.from('students').insert({
      tenant_id: locals.tenantId,
      first_name: form.data.first_name,
      last_name: form.data.last_name,
      admission_no: form.data.admission_no,
      grade: form.data.grade || null,
      status: form.data.status ?? 'active',
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Student created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(studentSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });

    const { error } = await locals.srv.from('students')
      .update({ first_name: form.data.first_name, last_name: form.data.last_name, admission_no: form.data.admission_no, grade: form.data.grade || null, status: form.data.status ?? 'active' })
      .eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Student updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('students').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Student deleted successfully');
  },
} satisfies Actions;
