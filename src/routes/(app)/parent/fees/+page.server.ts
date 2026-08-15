import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getParentOwnership } from '$lib/server/_auth/ownership';
import { getParentLedger } from '$lib/server/_finance/payments';

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'parent');

  const { tenantId, parent, studentIds } = await getParentOwnership(locals);
  const { data: feeTypes } = await locals.srv
    .from('fee_types')
    .select('id, name, amount, domain, due_date, term')
    .eq('tenant_id', tenantId)
    .eq('domain', 'school')
    .is('deleted_at', null)
    .order('name');

  const ledger = studentIds.length > 0 ? await getParentLedger(locals.srv, tenantId, studentIds) : [];

  return {
    parent,
    fees: feeTypes ?? [],
    ledger,
  };
};
