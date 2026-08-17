import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { checkRateLimit, rateLimitedHeaders } from '$lib/server/_platform/rate-limit';
import { csvResponse } from '$lib/server/_platform/csv';
import { EXPORT_MAX_ROWS } from '$lib/config';

export const GET: RequestHandler = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');
  const rl = await checkRateLimit(locals.srv, `csv:${locals.tenantId}`, 'global');
  if (!rl.allowed) {
    return new Response('Too many requests', { status: 429, headers: rateLimitedHeaders(rl) });
  }

  const { data: payments } = await locals.srv
    .from('payments')
    .select(`
      id, amount, method, domain, bank_reference, mpesa_receipt, phone, receipt_no, created_at,
      students!inner(first_name, last_name, admission_no, grade),
      fee_types(name)
    `)
    .eq('tenant_id', locals.tenantId)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(EXPORT_MAX_ROWS);

  if (!payments) error(500, 'Failed to fetch revenue data');

  const headers = ['Student', 'Admission No', 'Grade', 'Fee', 'Amount (KES)', 'Channel', 'Reference', 'Receipt No', 'Created At'];
  const rows = payments.map((r) => [
    `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
    r.students?.admission_no ?? '',
    r.students?.grade ?? '',
    (r.fee_types as { name?: string } | null)?.name ?? '',
    Number(r.amount).toFixed(2),
    r.domain === 'remedial' ? 'M-Pesa' : (r.method ?? ''),
    r.method === 'bank' ? (r.bank_reference ?? '') : (r.mpesa_receipt ?? ''),
    r.receipt_no ?? r.id.slice(0, 8),
    r.created_at ? new Date(r.created_at).toISOString() : '',
  ]);

  return csvResponse(headers, rows, `revenue-${new Date().toISOString().slice(0, 10)}.csv`);
};
