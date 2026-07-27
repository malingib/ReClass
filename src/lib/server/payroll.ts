import { fail } from '@sveltejs/kit';
import { logError } from '$lib/server/log';
import { rpc } from './query';
import { PAGE_LIST_LARGE } from '$lib/config';

type TeacherRef = { first_name?: string | null; last_name?: string | null };
type PayrollRunRow = { teachers?: TeacherRef | null; [k: string]: unknown };
type PayrollDraft = {
  tenant_id: string; teacher_id: string; period_start: string; period_end: string;
  occurrences_count: number; rate_per_session: number; amount: number; status: string;
};

export async function getPayrollRuns(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('payroll_runs')
    .select(`
      id, teacher_id, period_start, period_end, occurrences_count, rate_per_session, amount, status, paid_at, created_at,
      teachers!inner(first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(PAGE_LIST_LARGE);

  return ((data ?? []) as PayrollRunRow[]).map((r) => ({
    ...r,
    teacher_name: r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : 'Unknown',
  }));
}

export async function getTeachersList(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .order('first_name');
  return data ?? [];
}

export async function generatePayroll(
  sb: App.Locals['srv'],
  tid: string,
  periodStart: string,
  periodEnd: string,
) {
  if (!periodStart || !periodEnd) {
    return fail(400, { error: 'Period start and end dates are required.' });
  }
  if (new Date(periodEnd) < new Date(periodStart)) {
    return fail(400, { error: 'Period end must be after period start.' });
  }

  const { data: tenant } = await sb
    .from('tenants')
    .select('payroll_rate_per_session')
    .eq('id', tid)
    .single();

  const ratePerSession = Number(tenant?.payroll_rate_per_session ?? 0);
  if (ratePerSession <= 0) {
    return fail(400, { error: 'Payroll rate per session is not set. Configure it in Settings > Academic.' });
  }

  const { data: counts, error: countErr } = await rpc<{ teacher_id: string; occurrences_count: number }[]>(
    sb,
    'aggregate_payroll_counts',
    { p_tenant_id: tid, p_period_start: periodStart, p_period_end: periodEnd },
  );

  if (countErr) {
    logError('payroll_generate', countErr, { periodStart, periodEnd });
    return fail(500, { error: 'Failed to count attendance. Please try again.' });
  }

  const payrollRecords: PayrollDraft[] = [];
  for (const row of counts ?? []) {
    if (row.occurrences_count === 0) continue;
    payrollRecords.push({
      tenant_id: tid,
      teacher_id: row.teacher_id,
      period_start: periodStart,
      period_end: periodEnd,
      occurrences_count: row.occurrences_count,
      rate_per_session: ratePerSession,
      amount: row.occurrences_count * ratePerSession,
      status: 'draft',
    });
  }

  if (payrollRecords.length === 0) {
    return fail(400, { error: 'No teacher attendance found in this period. Mark attendance first.' });
  }

  const { error: insertError } = await sb
    .from('payroll_runs')
    .upsert(payrollRecords, { onConflict: 'tenant_id,teacher_id,period_start,period_end', ignoreDuplicates: false });

  if (insertError) {
    logError('payroll_generate', insertError, { periodStart, periodEnd });
    if (insertError.code === '23505') {
      return fail(409, { error: 'Payroll for this period already exists. Delete existing runs first or choose a different period.' });
    }
    return fail(500, { error: 'Failed to generate payroll records. Please try again.' });
  }

  return {
    success: true as const,
    count: payrollRecords.length,
    totalAmount: payrollRecords.reduce((sum, r) => sum + r.amount, 0),
    periodStart,
    periodEnd,
  };
}

export async function approvePayrollRun(sb: App.Locals['srv'], tid: string, id: string) {
  if (!id) return fail(400, { error: 'Payroll run ID is required' });

  const { data: run } = await sb.from('payroll_runs').select('status').eq('id', id).eq('tenant_id', tid).maybeSingle();
  if (!run) return fail(404, { error: 'Payroll run not found.' });
  if (run.status !== 'draft') return fail(400, { error: 'Only draft runs can be approved.' });

  const { error } = await sb
    .from('payroll_runs')
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('tenant_id', tid)
    .eq('status', 'draft');

  if (error) {
    logError('payroll_approve', error, { id });
    return fail(500, { error: 'Failed to approve payroll run.' });
  }

  return { success: true as const };
}

export async function markPayrollPaid(sb: App.Locals['srv'], tid: string, id: string) {
  if (!id) return fail(400, { error: 'Payroll run ID is required' });

  const { data: run } = await sb.from('payroll_runs').select('status').eq('id', id).eq('tenant_id', tid).maybeSingle();
  if (!run) return fail(404, { error: 'Payroll run not found.' });
  if (run.status !== 'approved') return fail(400, { error: 'Only approved runs can be marked paid.' });

  const { error } = await sb
    .from('payroll_runs')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tid)
    .eq('status', 'approved');

  if (error) {
    logError('payroll_pay', error, { id });
    return fail(500, { error: 'Failed to mark payroll as paid.' });
  }

  return { success: true as const };
}
