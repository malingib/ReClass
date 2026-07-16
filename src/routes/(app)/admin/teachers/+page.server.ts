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
  email: z.string().optional(),
  phone: z.string().optional(),
  subjects: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(teacherSchema));
  const { data: teachers } = await locals.supabase
    .from('teachers').select('id, first_name, last_name, email, phone, subjects, status').order('first_name');
  return { form, teachers: teachers ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(teacherSchema));
    if (!form.valid) return fail(400, { form });
    const subjects = form.data.subjects ? form.data.subjects.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const { error } = await locals.supabase.from('teachers').insert({
      first_name: form.data.first_name, last_name: form.data.last_name,
      email: form.data.email || null, phone: form.data.phone || null,
      subjects: subjects.length > 0 ? subjects : null, status: form.data.status ?? 'active',
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Teacher created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(teacherSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const subjects = form.data.subjects ? form.data.subjects.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const { error } = await locals.supabase.from('teachers')
      .update({ first_name: form.data.first_name, last_name: form.data.last_name, email: form.data.email || null, phone: form.data.phone || null, subjects: subjects.length > 0 ? subjects : null, status: form.data.status ?? 'active' })
      .eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Teacher updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.supabase.from('teachers').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Teacher deleted successfully');
  },
} satisfies Actions;
