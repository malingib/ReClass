import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const expenseSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  incurred_at: z.string().min(1, 'Date is required'),
  vendor: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const { data: expenses } = await locals.srv
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('incurred_at', { ascending: false })
    .limit(100);

  const categoryBreakdown: Record<string, number> = {};
  let totalExpenses = 0;
  for (const e of expenses ?? []) {
    totalExpenses += Number(e.amount);
    const cat = e.category ?? 'other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Number(e.amount);
  }

  return {
    expenses: expenses ?? [],
    totalExpenses,
    categoryBreakdown,
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    const v = parseForm(expenseSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });

    const { error } = await locals.srv.from('expenses').insert({
      tenant_id: tenantId,
      description: v.data.description,
      amount: v.data.amount,
      category: v.data.category,
      incurred_at: v.data.incurred_at,
      vendor: v.data.vendor || null,
      notes: v.data.notes || null,
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Expense recorded successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    const v = parseForm(expenseSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const { error } = await locals.srv.from('expenses')
      .update({
        description: v.data.description,
        amount: v.data.amount,
        category: v.data.category,
        incurred_at: v.data.incurred_at,
        vendor: v.data.vendor || null,
        notes: v.data.notes || null,
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Expense updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('expenses')
      .delete()
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Expense deleted successfully' };
  },
} satisfies Actions;
