import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { countRecords } from '$lib/server/_platform/query';
import { getAttendanceCounts } from '$lib/server/_remedial/attendance';
import { getInvoiceCounts, getRevenueSum } from '$lib/server/_finance/invoices';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [attendance, invoiceCounts, sessionsCovered, totalPayments] = await Promise.all([
    getAttendanceCounts(locals.srv, tenantId),
    getInvoiceCounts(locals.srv, tenantId),
    countRecords(locals.srv, 'session_occurrences', tenantId, q => q.eq('status', 'done')),
    getRevenueSum(locals.srv, tenantId),
  ]);

  return {
    stats: {
      attendanceTotal: attendance.total,
      attendanceRate: attendance.rate,
      absenteeCount: attendance.absent,
      sessionsCovered,
      totalInvoices: invoiceCounts.total,
      paidInvoices: invoiceCounts.paid,
      totalPayments,
    },
  };
};
