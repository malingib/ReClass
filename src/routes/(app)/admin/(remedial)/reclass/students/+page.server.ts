import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getStudentLedger } from '$lib/server/_finance/payments';

// Remedial student ledger — every student (all attend remedials) with what
// they've paid and their balance, per domain.
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const [school, remedial] = await Promise.all([
    getStudentLedger(locals.srv, tenantId, 'school'),
    getStudentLedger(locals.srv, tenantId, 'remedial'),
  ]);

  return { school, remedial };
};
