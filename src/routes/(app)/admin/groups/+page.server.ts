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
  room: z.string().optional(),
  capacity: z.coerce.number().int().min(0).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(groupSchema));
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: groups } = await sb
    .from('remedial_groups')
    .select('id, name, subject_id, teacher_id, room, capacity')
    .eq('tenant_id', tid)
    .order('name');

  const { data: subjects } = await sb
    .from('subjects')
    .select('id, name, code')
    .eq('tenant_id', tid)
    .order('name');

  const { data: teachers } = await sb
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('tenant_id', tid)
    .order('first_name');

  return { form, groups: groups ?? [], subjects: subjects ?? [], teachers: teachers ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(groupSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('remedial_groups').insert({
      tenant_id: locals.tenantId,
      name: form.data.name,
      subject_id: form.data.subject_id || null,
      teacher_id: form.data.teacher_id || null,
      room: form.data.room || null,
      capacity: form.data.capacity || null,
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Group created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(groupSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const { error } = await locals.srv.from('remedial_groups')
      .update({
        name: form.data.name,
        subject_id: form.data.subject_id || null,
        teacher_id: form.data.teacher_id || null,
        room: form.data.room || null,
        capacity: form.data.capacity || null,
      })
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Group updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('remedial_groups')
      .delete()
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Group deleted successfully');
  },
} satisfies Actions;
