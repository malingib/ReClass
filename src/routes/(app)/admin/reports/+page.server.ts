import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { countRecords } from '$lib/server/query';
import { getAttendanceCounts } from '$lib/server/attendance';
import { getInvoiceCounts, getRevenueSum } from '$lib/server/invoices';

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
