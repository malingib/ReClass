import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getReceipts } from '$lib/server/_finance/receipts';

// School receipts — payments in the school domain (bank/KCB + school M-Pesa).
export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
  return { payments: await getReceipts(locals.srv, locals.tenantId, 'school') };
};
