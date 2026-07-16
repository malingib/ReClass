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
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(subjectSchema));
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: subjects } = await sb
    .from('subjects')
    .select('id, name, code')
    .eq('tenant_id', tid)
    .order('name');

  return { form, subjects: subjects ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(subjectSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('subjects').insert({
      tenant_id: locals.tenantId,
      name: form.data.name,
      code: form.data.code || null,
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Subject created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(subjectSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const { error } = await locals.srv.from('subjects')
      .update({
        name: form.data.name,
        code: form.data.code || null,
      })
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Subject updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('subjects')
      .delete()
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Subject deleted successfully');
  },
} satisfies Actions;
