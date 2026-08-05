import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getReceipts } from '$lib/server/_finance/receipts';

// Remedial receipts — payments in the remedial domain (M-Pesa paybill).
export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');
  return { payments: await getReceipts(locals.srv, locals.tenantId, 'remedial') };
};
