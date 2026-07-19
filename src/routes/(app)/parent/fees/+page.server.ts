import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'parent');
  const { data: feeTypes } = await locals.srv
    .from('fee_types')
    .select('id, name, amount, due_date, term')
    .eq('tenant_id', locals.tenantId)
    .order('name');

  return { fees: feeTypes ?? [] };
};
