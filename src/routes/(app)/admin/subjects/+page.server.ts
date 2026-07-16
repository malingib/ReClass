// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(subjectSchema));
  const { data: subjects } = await locals.supabase
    .from('subjects').select('id, name, code, description, teachers_count, status').order('name');
  return { form, subjects: subjects ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(subjectSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.supabase.from('subjects').insert({ name: form.data.name, code: form.data.code || null, description: form.data.description || null, status: form.data.status ?? 'active' });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Subject created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(subjectSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const { error } = await locals.supabase.from('subjects').update({ name: form.data.name, code: form.data.code || null, description: form.data.description || null, status: form.data.status ?? 'active' }).eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Subject updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.supabase.from('subjects').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Subject deleted successfully');
  },
} satisfies Actions;
