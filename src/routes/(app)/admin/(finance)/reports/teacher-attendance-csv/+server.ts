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

  const { data: attendance } = await locals.srv
    .from('teacher_attendance')
    .select(`
      id, status, marked_at,
      teachers!inner(first_name, last_name),
      session_occurrences!inner(
        occurs_on, start_time, end_time,
        sessions!inner(day_of_week, slot)
      )
    `)
    .eq('tenant_id', locals.tenantId)
    .order('marked_at', { ascending: false })
    .limit(EXPORT_MAX_ROWS);

  if (!attendance) error(500, 'Failed to fetch attendance data');

  const headers = ['Teacher', 'Session', 'Slot', 'Date', 'Start', 'End', 'Status', 'Marked At'];
  const rows = attendance.map((r) => [
    `${r.teachers?.first_name ?? ''} ${r.teachers?.last_name ?? ''}`,
    '',
    r.session_occurrences?.sessions?.slot ?? '',
    r.session_occurrences?.occurs_on ?? '',
    r.session_occurrences?.start_time?.slice(0, 5) ?? '',
    r.session_occurrences?.end_time?.slice(0, 5) ?? '',
    r.status,
    r.marked_at ? new Date(r.marked_at).toISOString() : '',
  ]);

  return csvResponse(headers, rows, `teacher-attendance-${new Date().toISOString().slice(0, 10)}.csv`);
};
