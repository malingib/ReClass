import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const { data: runs } = await locals.srv
    .from('payroll_runs')
    .select('id, amount, status, rate_per_session, occurrences_count, period_start, period_end, paid_at, teacher_id, teachers(first_name, last_name)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const rows = runs ?? [];
  const totalRuns = rows.length;
  const paidRuns = rows.filter(r => r.status === 'paid').length;
  const pendingRuns = rows.filter(r => r.status !== 'paid').length;
  const totalPaid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalDue = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return {
    stats: { totalRuns, paidRuns, pendingRuns, totalPaid, totalDue },
    runs: rows.map((r: any) => ({
      ...r,
      teacher_name: r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '—',
    })),
  };
};
