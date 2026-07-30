import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';

const feeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  due_date: z.string().max(50).optional(),
  term: z.string().max(100).optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const { data: fees } = await locals.srv
    .from('fee_types')
    .select('id, name, amount, due_date, term')
    .order('name')
    .eq('tenant_id', tenantId)
    .eq('domain', 'remedial');
  return { fees: fees ?? [] };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(feeSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('fee_types').insert({
      tenant_id: tenantId,
      name: v.data.name,
      amount: v.data.amount,
      due_date: v.data.due_date || null,
      term: v.data.term || null,
      domain: 'remedial',
    });
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Remedial fee created successfully' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(feeSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });
    const { error } = await locals.srv.from('fee_types').update({
      name: v.data.name,
      amount: v.data.amount,
      due_date: v.data.due_date || null,
      term: v.data.term || null,
    }).eq('id', v.data.id).eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Remedial fee updated successfully' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('fee_types').delete().eq('id', v.data.id).eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Remedial fee deleted successfully' };
  },
};
