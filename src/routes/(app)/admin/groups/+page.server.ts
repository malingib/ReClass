// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  subject_id: z.string().optional(),
  teacher_id: z.string().optional(),
  grade: z.string().optional(),
  room: z.string().optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(groupSchema));
  const { data: groups } = await locals.supabase
    .from('remedial_groups').select('id, name, subject, grade, room, capacity, teacher_id, student_count, status').order('name');
  const { data: subjects } = await locals.supabase
    .from('subjects').select('id, name, code').eq('status', 'active').order('name');
  const { data: teachers } = await locals.supabase
    .from('teachers').select('id, first_name, last_name').eq('status', 'active').order('first_name');
  return { form, groups: groups ?? [], subjects: subjects ?? [], teachers: teachers ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(groupSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.supabase.from('remedial_groups').insert({ name: form.data.name, subject_id: form.data.subject_id || null, teacher_id: form.data.teacher_id || null, grade: form.data.grade || null, room: form.data.room || null, capacity: form.data.capacity || null, status: form.data.status ?? 'active' });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Group created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(groupSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const { error } = await locals.supabase.from('remedial_groups').update({ name: form.data.name, subject_id: form.data.subject_id || null, teacher_id: form.data.teacher_id || null, grade: form.data.grade || null, room: form.data.room || null, capacity: form.data.capacity || null, status: form.data.status ?? 'active' }).eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Group updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.supabase.from('remedial_groups').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Group deleted successfully');
  },
} satisfies Actions;
