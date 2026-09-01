import { fail } from '@sveltejs/kit';
import { logError } from '../_platform/log';
import { rpc } from '../_platform/query';
import { PAGE_LIST_LARGE } from '$lib/config';

type TeacherRef = { first_name?: string | null; last_name?: string | null };
type PayrollRunRow = { teachers?: TeacherRef | null; [k: string]: unknown };
type PayrollDraft = {
  tenant_id: string; teacher_id: string; period_start: string; period_end: string;
  occurrences_count: number; rate_per_session: number; amount: number; status: string;
  domain: 'school' | 'remedial'; salary_amount?: number | null;
};

type PayrollComponentInsert = {
  tenant_id: string; payroll_run_id: string; teacher_id: string;
  component_type: 'base_salary' | 'allowance' | 'remedial' | 'committee' | 'role_specific' | 'adjustment';
  role_code?: string | null; role_label?: string | null; description: string;
  quantity: number; rate: number; amount: number; source_type: string; source_id?: string | null;
  metadata?: Record<string, unknown>;
};

/** Payroll runs for a domain. Finance = school (salary), remedial = per-session. */
export async function getPayrollRuns(sb: App.Locals['srv'], tenantId: string, domain: 'school' | 'remedial' = 'remedial') {
  const { data } = await sb
    .from('payroll_runs')
    .select(`id, teacher_id, period_start, period_end, occurrences_count, rate_per_session, amount, status, paid_at, created_at, domain, salary_amount, last_error, b2c_status, teachers!inner(first_name, last_name)`)
    .eq('tenant_id', tenantId).eq('domain', domain)
    .order('created_at', { ascending: false }).limit(PAGE_LIST_LARGE);
  return ((data ?? []) as PayrollRunRow[]).map((r) => ({
    ...r, teacher_name: r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : 'Unknown',
  })) as (PayrollRunRow & { teacher_name: string; status?: string; amount?: number; period_start?: string; period_end?: string; occurrences_count?: number; rate_per_session?: number; paid_at?: string | null; })[];
}

export async function getTeachersList(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('teachers').select('id, first_name, last_name').eq('tenant_id', tenantId).is('deleted_at', null).order('first_name');
  return data ?? [];
}

async function addPayrollComponents(sb: App.Locals['srv'], components: PayrollComponentInsert[]) {
  if (components.length === 0) return null;
  const { error } = await sb.from('payroll_components').insert(components);
  return error ?? null;
}

/** Remedial payroll: approved teacher attendance × configured rate. */
export async function generateRemedialPayroll(sb: App.Locals['srv'], tid: string, periodStart: string, periodEnd: string) {
  if (!periodStart || !periodEnd) return fail(400, { error: 'Period start and end dates are required.' });
  if (new Date(periodEnd) < new Date(periodStart)) return fail(400, { error: 'Period end must be after period start.' });

  const { data: tenant } = await sb.from('tenants').select('payroll_rate_per_session').eq('id', tid).single();
  const ratePerSession = Number(tenant?.payroll_rate_per_session ?? 0);
  if (ratePerSession <= 0) return fail(400, { error: 'Payroll rate per session is not set. Configure it in Settings > Academic.' });

  const { data: teacherRates } = await sb.from('teachers').select('id, remedial_rate_per_session').eq('tenant_id', tid).is('deleted_at', null);
  const rateById = new Map<string, number>((teacherRates ?? []).map((t: { id: string; remedial_rate_per_session?: number | null }) => [t.id, Number(t.remedial_rate_per_session ?? 0)]));

  const { data: counts, error: countErr } = await rpc<{ teacher_id: string; occurrences_count: number }[]>(sb, 'aggregate_payroll_counts', { p_tenant_id: tid, p_period_start: periodStart, p_period_end: periodEnd });
  if (countErr) { logError('payroll_generate', countErr, { periodStart, periodEnd }); return fail(500, { error: 'Failed to count attendance. Please try again.' }); }

  const payrollRecords: PayrollDraft[] = [];
  for (const row of counts ?? []) {
    if (row.occurrences_count === 0) continue;
    const perTeacherRate = rateById.get(row.teacher_id) ?? 0;
    const effectiveRate = perTeacherRate > 0 ? perTeacherRate : ratePerSession;
    payrollRecords.push({ tenant_id: tid, teacher_id: row.teacher_id, period_start: periodStart, period_end: periodEnd, occurrences_count: row.occurrences_count, rate_per_session: effectiveRate, amount: row.occurrences_count * effectiveRate, status: 'draft', domain: 'remedial' });
  }
  if (payrollRecords.length === 0) return fail(400, { error: 'No teacher attendance found in this period. Mark attendance first.' });

  const { data: insertedRuns, error: insertError } = await sb.from('payroll_runs').upsert(payrollRecords, { onConflict: 'tenant_id,teacher_id,period_start,period_end,domain', ignoreDuplicates: false }).select('id, teacher_id');
  if (insertError) {
    logError('payroll_generate', insertError, { periodStart, periodEnd });
    if (insertError.code === '23505') return fail(409, { error: 'Payroll for this period already exists. Delete existing runs first or choose a different period.' });
    return fail(500, { error: 'Failed to generate payroll records. Please try again.' });
  }

  const components: PayrollComponentInsert[] = (insertedRuns ?? []).map((run: { id: string; teacher_id: string }) => {
    const source = payrollRecords.find((p) => p.teacher_id === run.teacher_id)!;
    return { tenant_id: tid, payroll_run_id: run.id, teacher_id: run.teacher_id, component_type: 'remedial', description: `Remedial teaching: ${source.occurrences_count} attended sessions`, quantity: source.occurrences_count, rate: source.rate_per_session, amount: source.amount, source_type: 'teacher_attendance', metadata: { period_start: periodStart, period_end: periodEnd } };
  });
  const componentError = await addPayrollComponents(sb, components);
  if (componentError) { logError('payroll_components_generate', componentError, { periodStart, periodEnd }); return fail(500, { error: 'Payroll was created but compensation lines could not be recorded. Do not pay until this is resolved.' }); }

  return { success: true as const, count: payrollRecords.length, totalAmount: payrollRecords.reduce((sum, r) => sum + r.amount, 0), periodStart, periodEnd };
}

/** School payroll: monthly contractual salary, represented as a base-salary component. */
export async function generateSchoolPayroll(sb: App.Locals['srv'], tid: string, periodStart: string, periodEnd: string) {
  if (!periodStart || !periodEnd) return fail(400, { error: 'Period start and end dates are required.' });
  if (new Date(periodEnd) < new Date(periodStart)) return fail(400, { error: 'Period end must be after period start.' });

  const { data: salaried } = await sb.from('teachers').select('id, salary_monthly').eq('tenant_id', tid).is('deleted_at', null).not('salary_monthly', 'is', null).gt('salary_monthly', 0);
  const teachers = salaried ?? [];
  if (teachers.length === 0) return fail(400, { error: 'No salaried (B.O.M.) teachers found. Set a monthly salary on teacher records first.' });

  const payrollRecords: PayrollDraft[] = teachers.map((t: { id: string; salary_monthly?: number | null }) => ({ tenant_id: tid, teacher_id: t.id, period_start: periodStart, period_end: periodEnd, occurrences_count: 1, rate_per_session: 0, amount: Number(t.salary_monthly ?? 0), status: 'draft', domain: 'school', salary_amount: Number(t.salary_monthly ?? 0) }));
  const { data: insertedRuns, error: insertError } = await sb.from('payroll_runs').upsert(payrollRecords, { onConflict: 'tenant_id,teacher_id,period_start,period_end,domain', ignoreDuplicates: false }).select('id, teacher_id');
  if (insertError) {
    logError('payroll_generate_school', insertError, { periodStart, periodEnd });
    if (insertError.code === '23505') return fail(409, { error: 'School payroll for this period already exists. Delete existing runs first or choose a different period.' });
    return fail(500, { error: 'Failed to generate school payroll records. Please try again.' });
  }

  const components: PayrollComponentInsert[] = (insertedRuns ?? []).map((run: { id: string; teacher_id: string }) => {
    const source = payrollRecords.find((p) => p.teacher_id === run.teacher_id)!;
    return { tenant_id: tid, payroll_run_id: run.id, teacher_id: run.teacher_id, component_type: 'base_salary', description: 'Monthly contractual salary', quantity: 1, rate: source.amount, amount: source.amount, source_type: 'salary_contract', metadata: { period_start: periodStart, period_end: periodEnd } };
  });
  const componentError = await addPayrollComponents(sb, components);
  if (componentError) { logError('payroll_components_generate_school', componentError, { periodStart, periodEnd }); return fail(500, { error: 'Payroll was created but compensation lines could not be recorded. Do not pay until this is resolved.' }); }

  return { success: true as const, count: payrollRecords.length, totalAmount: payrollRecords.reduce((sum, r) => sum + r.amount, 0), periodStart, periodEnd };
}

export async function approvePayrollRun(sb: App.Locals['srv'], tid: string, id: string) {
  if (!id) return fail(400, { error: 'Payroll run ID is required' });
  const { data: run } = await sb.from('payroll_runs').select('status').eq('id', id).eq('tenant_id', tid).maybeSingle();
  if (!run) return fail(404, { error: 'Payroll run not found.' });
  if (run.status !== 'draft') return fail(400, { error: 'Only draft runs can be approved.' });
  const { error, count } = await sb.from('payroll_runs').update({ status: 'approved' }).eq('id', id).eq('tenant_id', tid).eq('status', 'draft');
  if (error) { logError('payroll_approve', error, { id }); return fail(500, { error: 'Failed to approve payroll run.' }); }
  if (count === 0) return fail(400, { error: 'Payroll run status changed or was already updated.' });
  return { success: true as const };
}

export async function markPayrollPaid(sb: App.Locals['srv'], tid: string, id: string) {
  if (!id) return fail(400, { error: 'Payroll run ID is required' });
  const { data: run } = await sb.from('payroll_runs').select('status').eq('id', id).eq('tenant_id', tid).maybeSingle();
  if (!run) return fail(404, { error: 'Payroll run not found.' });
  if (run.status !== 'approved') return fail(400, { error: 'Only approved runs can be marked paid.' });
  const { error, count } = await sb.from('payroll_runs').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tid).eq('status', 'approved');
  if (error) { logError('payroll_pay', error, { id }); return fail(500, { error: 'Failed to mark payroll as paid.' }); }
  if (count === 0) return fail(400, { error: 'Payroll run status changed or was already updated.' });
  return { success: true as const };
}

export async function getTeacherCommitteeRole(sb: App.Locals['srv'], tenantId: string, profileId: string | undefined): Promise<{ id: string; remedial_role: string; phone: string | null } | undefined> {
  if (!profileId) return undefined;
  const { data } = await sb.from('teachers').select('id, remedial_role, phone').eq('tenant_id', tenantId).eq('profile_id', profileId).is('deleted_at', null).maybeSingle();
  return data ?? undefined;
}

export async function payPayrollRunB2C(sb: App.Locals['srv'], tenantId: string, runId: string, actorId: string | undefined) {
  if (!runId) return fail(400, { error: 'Payroll run ID is required' });
  const { data: run } = await sb.from('payroll_runs').select('status').eq('id', runId).eq('tenant_id', tenantId).maybeSingle();
  if (!run) return fail(404, { error: 'Payroll run not found.' });
  if (run.status === 'paid') return fail(409, { error: 'This payroll run is already paid.' });
  if (run.status === 'processing') return fail(409, { error: 'This payroll run is already being processed.' });
  if (run.status !== 'approved') return fail(409, { error: `Only approved runs can be paid (current: ${run.status}).` });
  let result: { data?: unknown; error?: { message?: string } };
  try {
    const resp = await sb.functions.invoke('b2c', { body: { tenant_id: tenantId, run_id: runId, actor_id: actorId ?? null } });
    result = { data: resp?.data, error: resp?.error ? { message: resp.error.message } : undefined };
  } catch (err) { logError('payroll_b2c_invoke', err instanceof Error ? err : new Error(String(err)), { runId }); return fail(502, { error: 'Payout service unreachable. Please try again.' }); }
  if (result?.error) { logError('payroll_b2c_response', new Error(result.error.message ?? 'Payout service returned an error'), { runId }); return fail(502, { error: 'Payout service could not process the request. Please try again.' }); }
  const status = (result?.data as { status?: string; error?: string; message?: string }) ?? {};
  if (status.status === 'processing') {
    const { error: transitionError, count } = await sb.from('payroll_runs').update({ status: 'processing' }).eq('id', runId).eq('tenant_id', tenantId).eq('status', 'approved');
    if (transitionError || count === 0) { logError('payroll_b2c_transition', transitionError ?? new Error('Payroll state changed during payout transition'), { runId }); return fail(409, { error: 'Payroll state changed while the payout was being initiated. Refresh before retrying.' }); }
    return { success: true as const, message: 'Payout request sent to M-Pesa. Confirmation is pending.' };
  }
  if (status.status === 'rejected') return fail(502, { error: status.message ?? 'M-Pesa rejected the payout request.' });
  return fail(409, { error: status.message ?? 'Payout could not be initiated.' });
}
