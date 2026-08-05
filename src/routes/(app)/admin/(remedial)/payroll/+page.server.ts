import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getPayrollRuns } from '$lib/server/_finance/payroll';

// Remedial payroll — per-session rate × approved attendance.
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const rows = await getPayrollRuns(locals.srv, tenantId, 'remedial');
  const totalRuns = rows.length;
  const paidRuns = rows.filter(r => r.status === 'paid').length;
  const pendingRuns = rows.filter(r => r.status !== 'paid').length;
  const totalPaid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalDue = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return {
    stats: { totalRuns, paidRuns, pendingRuns, totalPaid, totalDue },
    runs: rows,
  };
};
