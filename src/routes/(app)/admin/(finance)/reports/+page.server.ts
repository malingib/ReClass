import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { countRecords } from '$lib/server/_platform/query';
import { getAttendanceCounts } from '$lib/server/_remedial/attendance';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [attendance, schoolPayments, remedialPayments, totalPayments] = await Promise.all([
    getAttendanceCounts(locals.srv, tenantId),
    countRecords(locals.srv, 'payments', tenantId, q => q.eq('domain', 'school').eq('status', 'paid')),
    countRecords(locals.srv, 'payments', tenantId, q => q.eq('domain', 'remedial').eq('status', 'paid')),
    countRecordTotal(locals.srv, tenantId),
  ]);

  return {
    stats: {
      attendanceTotal: attendance.total,
      attendanceRate: attendance.rate,
      absenteeCount: attendance.absent,
      schoolPayments,
      remedialPayments,
      totalPayments,
    },
  };
};

async function countRecordTotal(sb: App.Locals['srv'], tenantId: string) {
  const { count } = await sb.from('payments').select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('status', 'paid');
  return count ?? 0;
}
