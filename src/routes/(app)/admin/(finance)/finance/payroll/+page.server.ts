import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getPayrollRuns, generateSchoolPayroll, approvePayrollRun, markPayrollPaid } from '$lib/server/_finance/payroll';

// School payroll — direct monthly salary for B.O.M.-employed teachers (Finance module).
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const rows = await getPayrollRuns(locals.srv, tenantId, 'school');
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

export const actions: Actions = {
  generate: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const res = await generateSchoolPayroll(
      locals.srv,
      tenantId,
      String(fd.get('period_start') ?? ''),
      String(fd.get('period_end') ?? ''),
    );
    if (!('success' in res)) return res;
    return { success: true as const, message: `${res.count} salary run(s) generated (KES ${res.totalAmount.toLocaleString()}).` };
  },
  approve: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    return approvePayrollRun(locals.srv, tenantId, String(fd.get('id') ?? ''));
  },
  'mark-paid': async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    return markPayrollPaid(locals.srv, tenantId, String(fd.get('id') ?? ''));
  },
};
