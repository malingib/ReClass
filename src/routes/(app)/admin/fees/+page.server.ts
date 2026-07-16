// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const feeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  due_date: z.string().optional(),
  term: z.string().optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(feeSchema));
  const { data: fees } = await locals.srv
    .from('fee_types').select('id, name, amount, due_date, term').order('name').eq('tenant_id', locals.tenantId);
  return { form, fees: fees ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(feeSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('fee_types').insert({
      tenant_id: locals.tenantId,
      name: form.data.name,
      amount: form.data.amount,
      due_date: form.data.due_date || null,
      term: form.data.term || null,
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Fee created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(feeSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const { error } = await locals.srv.from('fee_types').update({
      name: form.data.name,
      amount: form.data.amount,
      due_date: form.data.due_date || null,
      term: form.data.term || null,
    }).eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Fee updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('fee_types').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Fee deleted successfully');
  },
} satisfies Actions;
