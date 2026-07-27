import { fail } from '@sveltejs/kit';
import { logError } from '$lib/server/log';
import { rpc } from './query';
import { PAGE_LIST_LARGE } from '$lib/config';

type TeacherRef = { first_name?: string | null; last_name?: string | null; employee_no?: string | null };
type TeacherInvoiceRow = { teachers?: TeacherRef | null; [k: string]: unknown };
type TeacherInvoiceDraft = {
  tenant_id: string; teacher_id: string; amount_due: number; amount_paid: number; status: string;
  period_start: string; period_end: string; occurrences_count: number; rate_per_session: number;
};

export async function getTeacherInvoices(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('teacher_invoices')
    .select(`
      id, teacher_id, amount_due, amount_paid, status, period_start, period_end,
      occurrences_count, rate_per_session, due_date, paid_at, notes, created_at,
      teachers!inner(first_name, last_name, employee_no)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(PAGE_LIST_LARGE);

  return ((data ?? []) as TeacherInvoiceRow[]).map((r) => ({
    ...r,
    teacher_name: r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : 'Unknown',
    employee_no: r.teachers?.employee_no ?? '—',
  }));
}

export async function getTeacherInvoice(sb: App.Locals['srv'], tenantId: string, id: string) {
  const { data } = await sb
    .from('teacher_invoices')
    .select(`
      id, teacher_id, amount_due, amount_paid, status, period_start, period_end,
      occurrences_count, rate_per_session, due_date, paid_at, notes, created_at,
      teachers!inner(first_name, last_name, employee_no)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!data) return null;
  return {
    ...data,
    teacher_name: data.teachers ? `${data.teachers.first_name} ${data.teachers.last_name}` : 'Unknown',
    employee_no: data.teachers?.employee_no ?? '—',
  };
}

export async function generateTeacherInvoices(
  sb: App.Locals['srv'],
  tenantId: string,
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
    .eq('id', tenantId)
    .single();

  const ratePerSession = Number(tenant?.payroll_rate_per_session ?? 0);
  if (ratePerSession <= 0) {
    return fail(400, { error: 'Payroll rate per session is not set. Configure it in Settings.' });
  }

  const { data: counts, error: countErr } = await rpc<{ teacher_id: string; occurrences_count: number }[]>(
    sb,
    'aggregate_payroll_counts',
    { p_tenant_id: tenantId, p_period_start: periodStart, p_period_end: periodEnd },
  );

  if (countErr) {
    logError('teacher_invoice_generate', countErr, { periodStart, periodEnd });
    return fail(500, { error: 'Failed to count attendance. Please try again.' });
  }

  const records: TeacherInvoiceDraft[] = [];
  for (const row of counts ?? []) {
    if (row.occurrences_count === 0) continue;
    records.push({
      tenant_id: tenantId,
      teacher_id: row.teacher_id,
      amount_due: row.occurrences_count * ratePerSession,
      amount_paid: 0,
      status: 'unpaid',
      period_start: periodStart,
      period_end: periodEnd,
      occurrences_count: row.occurrences_count,
      rate_per_session: ratePerSession,
    });
  }

  if (records.length === 0) {
    return fail(400, { error: 'No teacher attendance found in this period. Mark attendance first.' });
  }

  const { error: insertError } = await sb.from('teacher_invoices').insert(records);

  if (insertError) {
    logError('teacher_invoice_generate', insertError, { periodStart, periodEnd });
    return fail(500, { error: 'Failed to generate teacher invoices. Please try again.' });
  }

  return {
    success: true as const,
    count: records.length,
    totalAmount: records.reduce((sum, r) => sum + r.amount_due, 0),
    periodStart,
    periodEnd,
  };
}

export async function getTeachersList(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('teachers')
    .select('id, first_name, last_name, employee_no')
    .eq('tenant_id', tenantId)
    .order('first_name');
  return data ?? [];
}


