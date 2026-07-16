import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: attendance } = await sb
    .from('teacher_attendance')
    .select(`
      id, status, marked_at,
      teachers!inner(first_name, last_name),
      session_occurrences!inner(
        occurs_on, start_time, end_time,
        sessions!inner(day_of_week, slot)
      )
    `)
    .eq('tenant_id', tid)
    .order('marked_at', { ascending: false })
    .limit(10000);

  if (!attendance) {
    error(500, 'Failed to fetch attendance data');
  }

  const headers = ['Teacher', 'Session', 'Slot', 'Date', 'Start', 'End', 'Status', 'Marked At'];
  const rows = attendance.map((r: any) => [
    `${r.teachers?.first_name ?? ''} ${r.teachers?.last_name ?? ''}`,
    '',
    r.session_occurrences?.sessions?.slot ?? '',
    r.session_occurrences?.occurs_on ?? '',
    r.session_occurrences?.start_time?.slice(0, 5) ?? '',
    r.session_occurrences?.end_time?.slice(0, 5) ?? '',
    r.status,
    r.marked_at ? new Date(r.marked_at).toISOString() : '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="teacher-attendance-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
