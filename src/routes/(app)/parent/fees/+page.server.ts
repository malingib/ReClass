import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: feeTypes } = await locals.srv
    .from('fee_types')
    .select('id, name, amount, due_date, term')
    .eq('tenant_id', locals.tenantId)
    .order('name');

  return { fees: feeTypes ?? [] };
};
