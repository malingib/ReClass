import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { checkRateLimit, rateLimitedHeaders } from '$lib/server/rate-limit';
import { csvResponse } from '$lib/server/csv';
import { EXPORT_MAX_ROWS } from '$lib/config';

export const GET: RequestHandler = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');
  const rl = await checkRateLimit(locals.srv, `csv:${locals.tenantId}`, 'global');
  if (!rl.allowed) {
    return new Response('Too many requests', { status: 429, headers: rateLimitedHeaders(rl) });
  }

  const { data: teachers } = await locals.srv
    .from('teachers')
    .select('first_name, last_name, employee_no, created_at')
    .eq('tenant_id', locals.tenantId)
    .order('first_name')
    .limit(EXPORT_MAX_ROWS);

  if (!teachers) error(500, 'Failed to fetch teacher data');

  const headers = ['First Name', 'Last Name', 'Employee No', 'Created At'];
  const rows = teachers.map((r) => [
    r.first_name ?? '',
    r.last_name ?? '',
    r.employee_no ?? '',
    r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
  ]);

  return csvResponse(headers, rows, `teachers-${new Date().toISOString().slice(0, 10)}.csv`);
};
