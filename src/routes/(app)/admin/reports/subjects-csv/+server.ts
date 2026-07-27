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

  const { data: subjects } = await locals.srv
    .from('subjects')
    .select('name, code, created_at')
    .eq('tenant_id', locals.tenantId)
    .order('name')
    .limit(EXPORT_MAX_ROWS);

  if (!subjects) error(500, 'Failed to fetch subject data');

  const headers = ['Subject Name', 'Code', 'Created At'];
  const rows = subjects.map((r) => [
    r.name ?? '',
    r.code ?? '',
    r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
  ]);

  return csvResponse(headers, rows, `subjects-${new Date().toISOString().slice(0, 10)}.csv`);
};
