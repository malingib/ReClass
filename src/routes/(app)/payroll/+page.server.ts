import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getPayrollRuns } from '$lib/server/_finance/payroll';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal', 'bursar');
  const payroll = await getPayrollRuns(locals.srv, tenantId, 'remedial');
  const first = payroll[0];
  const periodLabel = first?.period_start && first?.period_end
    ? `${first.period_start} – ${first.period_end}`
    : 'Current period';

  return {
    periodLabel,
    status: first?.status ?? 'draft',
    payroll: payroll.map((row) => ({
      ...row,
      gross_amount: row.amount ?? 0,
      deductions: 0,
      net_amount: row.amount ?? 0,
      receipt_number: null,
      status: row.status ?? 'draft',
    })),
  };
};
