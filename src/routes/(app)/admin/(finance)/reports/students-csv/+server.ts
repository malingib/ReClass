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

  const { data: students, error: dbErr } = await locals.srv
    .from('students')
    .select('admission_no, first_name, last_name, grade, status, created_at')
    .eq('tenant_id', locals.tenantId)
    .is('deleted_at', null)
    .order('first_name')
    .limit(EXPORT_MAX_ROWS);

  if (dbErr) error(500, 'Failed to fetch student data');

  const headers = ['Admission No', 'First Name', 'Last Name', 'Grade', 'Status', 'Created At'];
  const rows = students.map((r) => [
    r.admission_no ?? '',
    r.first_name ?? '',
    r.last_name ?? '',
    r.grade ?? '',
    r.status ?? '',
    r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
  ]);

  return csvResponse(headers, rows, `students-${new Date().toISOString().slice(0, 10)}.csv`);
};
