// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const invoiceSchema = z.object({
  id: z.string().optional(),
  student_id: z.string().min(1, 'Student is required'),
  amount_due: z.coerce.number().min(0, 'Amount must be positive'),
  due_date: z.string().optional(),
  status: z.enum(['unpaid', 'partial', 'paid', 'waived', 'overpaid']),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(invoiceSchema));
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: invoices } = await sb
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, created_at, students(first_name, last_name)')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false }).limit(500);

  const { data: students } = await sb
    .from('students')
    .select('id, admission_no, first_name, last_name')
    .eq('tenant_id', tid)
    .eq('status', 'active')
    .order('first_name');

  return { form, invoices: invoices ?? [], students: students ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(invoiceSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('invoices').insert({
      tenant_id: locals.tenantId,
      student_id: form.data.student_id,
      amount_due: form.data.amount_due,
      due_date: form.data.due_date || null,
      status: form.data.status ?? 'unpaid',
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Invoice created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(invoiceSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });
    const { error } = await locals.srv.from('invoices')
      .update({
        student_id: form.data.student_id,
        amount_due: form.data.amount_due,
        due_date: form.data.due_date || null,
        status: form.data.status ?? 'unpaid',
      })
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Invoice updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('invoices')
      .delete()
      .eq('id', form.data.id)
      .eq('tenant_id', locals.tenantId);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Invoice deleted successfully');
  },
} satisfies Actions;
