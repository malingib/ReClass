import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { parseForm } from '$lib/client/validation';
import { getTeacherInvoices, getTeachersList, generateTeacherInvoices } from '$lib/server/teacher-invoices';

const invoiceSchema = z.object({
  id: z.string().optional(),
  teacher_id: z.string().min(1, 'Teacher is required'),
  amount_due: z.coerce.number().min(0, 'Amount must be positive'),
  period_start: z.string().max(20).optional(),
  period_end: z.string().max(20).optional(),
  occurrences_count: z.coerce.number().min(0).optional(),
  rate_per_session: z.coerce.number().min(0).optional(),
  due_date: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [invoices, teachers] = await Promise.all([
    getTeacherInvoices(locals.srv, tenantId),
    getTeachersList(locals.srv, tenantId),
  ]);

  return { invoices, teachers };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(invoiceSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });

    const { data: teacher } = await locals.srv.from('teachers').select('id').eq('id', v.data.teacher_id).eq('tenant_id', tenantId).maybeSingle();
    if (!teacher) return fail(404, { message: 'Teacher not found' });

    const { error } = await locals.srv.from('teacher_invoices').insert({
      tenant_id: tenantId,
      teacher_id: v.data.teacher_id,
      amount_due: v.data.amount_due,
      amount_paid: 0,
      status: 'unpaid',
      period_start: v.data.period_start || null,
      period_end: v.data.period_end || null,
      occurrences_count: v.data.occurrences_count ?? 0,
      rate_per_session: v.data.rate_per_session ?? null,
      due_date: v.data.due_date || null,
      notes: v.data.notes || null,
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Teacher invoice created successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(invoiceSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const { data: teacher } = await locals.srv.from('teachers').select('id').eq('id', v.data.teacher_id).eq('tenant_id', tenantId).maybeSingle();
    if (!teacher) return fail(404, { message: 'Teacher not found' });

    const { error } = await locals.srv.from('teacher_invoices')
      .update({
        teacher_id: v.data.teacher_id,
        amount_due: v.data.amount_due,
        period_start: v.data.period_start || null,
        period_end: v.data.period_end || null,
        occurrences_count: v.data.occurrences_count ?? 0,
        rate_per_session: v.data.rate_per_session ?? null,
        due_date: v.data.due_date || null,
        notes: v.data.notes || null,
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Teacher invoice updated successfully' };
  },

  generate: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    return generateTeacherInvoices(locals.srv, tenantId, String(fd.get('period_start') ?? ''), String(fd.get('period_end') ?? ''));
  },

  pay: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const id = String(fd.get('id') ?? '');
    if (!id) return fail(400, { error: 'Invoice ID required' });

    const { data: inv } = await locals.srv.from('teacher_invoices').select('status, amount_due').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
    if (!inv) return fail(404, { error: 'Invoice not found.' });
    if (inv.status !== 'unpaid') return fail(400, { error: 'Only unpaid invoices can be marked paid.' });

    const { error, count } = await locals.srv.from('teacher_invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString(), amount_paid: Number(inv.amount_due) })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', 'unpaid');
    if (error) return fail(500, { error: 'Failed to mark as paid.' });
    if (!count) return fail(409, { error: 'Invoice was already paid by another action.' });
    return { success: true, message: 'Invoice marked as paid.' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('teacher_invoices')
      .delete()
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Invoice deleted successfully' };
  },
} satisfies Actions;
