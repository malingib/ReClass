import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import {
  getPayrollRuns,
  generateRemedialPayroll,
  approvePayrollRun,
  payPayrollRunB2C,
} from '$lib/server/_finance/payroll';

// Remedial payroll — per-session rate × approved attendance.
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const rows = await getPayrollRuns(locals.srv, tenantId, 'remedial');
  const totalRuns = rows.length;
  const paidRuns = rows.filter(r => r.status === 'paid').length;
  const processingRuns = rows.filter(r => r.status === 'processing').length;
  const pendingRuns = rows.filter(r => r.status === 'approved' || r.status === 'draft' || r.status === 'pending').length;
  const failedRuns = rows.filter(r => r.status === 'failed').length;
  const totalPaid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalDue = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return {
    stats: {
      totalRuns,
      paidRuns,
      processingRuns,
      pendingRuns,
      failedRuns,
      totalPaid,
      totalDue,
    },
    runs: rows,
  };
};

export const actions: Actions = {
  generate: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const res = await generateRemedialPayroll(
      locals.srv,
      tenantId,
      String(fd.get('period_start') ?? ''),
      String(fd.get('period_end') ?? ''),
    );
    if (!('success' in res)) return res;
    return { success: true as const, message: `${res.count} payroll run(s) generated (KES ${res.totalAmount.toLocaleString()}).` };
  },

  approve: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const res = await approvePayrollRun(locals.srv, tenantId, String(fd.get('id') ?? ''));
    if (!('success' in res)) return res;
    return { success: true as const, message: 'Payroll run approved. It can now be paid.' };
  },

  pay: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    return payPayrollRunB2C(locals.srv, tenantId, String(fd.get('id') ?? ''), user.id);
  },
};
