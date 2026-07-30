import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const incomeSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  received_at: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const { data: income } = await locals.srv
    .from('other_income')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('received_at', { ascending: false })
    .limit(100);

  const categoryBreakdown: Record<string, number> = {};
  let totalIncome = 0;
  for (const i of income ?? []) {
    totalIncome += Number(i.amount);
    const cat = i.category ?? 'other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Number(i.amount);
  }

  return {
    income: income ?? [],
    totalIncome,
    categoryBreakdown,
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    const v = parseForm(incomeSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });

    const { error } = await locals.srv.from('other_income').insert({
      tenant_id: tenantId,
      description: v.data.description,
      amount: v.data.amount,
      category: v.data.category,
      received_at: v.data.received_at,
      notes: v.data.notes || null,
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Income recorded successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    const v = parseForm(incomeSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const { error } = await locals.srv.from('other_income')
      .update({
        description: v.data.description,
        amount: v.data.amount,
        category: v.data.category,
        received_at: v.data.received_at,
        notes: v.data.notes || null,
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Income updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('other_income')
      .delete()
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Income deleted successfully' };
  },
} satisfies Actions;
