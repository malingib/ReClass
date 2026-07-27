import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { checkRateLimit, rateLimitedHeaders } from '$lib/server/rate-limit';
import { csvResponse } from '$lib/server/csv';
import { EXPORT_BURSA_MAX_ROWS } from '$lib/config';

export const GET: RequestHandler = async ({ locals }) => {
  requireTenantRole(locals, 'bursar');
  const rl = await checkRateLimit(locals.srv, `csv:${locals.tenantId}`, 'global');
  if (!rl.allowed) {
    return new Response('Too many requests', { status: 429, headers: rateLimitedHeaders(rl) });
  }

  const { data: invoices } = await locals.srv
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, status, due_date, created_at,
      students!inner(first_name, last_name, admission_no, grade)
    `)
    .eq('tenant_id', locals.tenantId)
    .order('created_at', { ascending: false })
    .limit(EXPORT_BURSA_MAX_ROWS);

  if (!invoices) error(500, 'Failed to fetch invoice data');

  const headers = ['Student Name', 'Admission No', 'Grade', 'Amount Due (KES)', 'Amount Paid (KES)', 'Balance (KES)', 'Status', 'Due Date', 'Created At'];
  const rows = invoices.map((r) => {
    const due = Number(r.amount_due);
    const paid = Number(r.amount_paid);
    return [
      `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`,
      r.students?.admission_no ?? '',
      r.students?.grade ?? '',
      due.toFixed(2),
      paid.toFixed(2),
      (due - paid).toFixed(2),
      r.status,
      r.due_date ?? '',
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
    ];
  });

  return csvResponse(headers, rows, `all-invoices-${new Date().toISOString().slice(0, 10)}.csv`);
};
