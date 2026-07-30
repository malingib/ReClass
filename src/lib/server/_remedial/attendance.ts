import { paginatedQuery, countRecords } from '../_platform/query';

export async function getAttendanceByTenant(
  sb: App.Locals['srv'],
  tenantId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  return paginatedQuery<Record<string, unknown>>(sb, 'teacher_attendance', tenantId, {
    select: 'id, status, marked_at, teacher_id, occurrence_id, teachers(first_name, last_name)',
    order: { column: 'marked_at', ascending: false },
    page: opts.page,
    pageSize: opts.pageSize,
  });
}

export async function getAttendanceCounts(sb: App.Locals['srv'], tenantId: string) {
  const [total, present, absent] = await Promise.all([
    countRecords(sb, 'teacher_attendance', tenantId),
    countRecords(sb, 'teacher_attendance', tenantId, q => q.in('status', ['present', 'late'])),
    countRecords(sb, 'teacher_attendance', tenantId, q => q.eq('status', 'absent')),
  ]);
  return { total, present, absent, rate: total ? Math.round((present / total) * 100) : 0 };
}

export async function getRecentAttendance(
  sb: App.Locals['srv'],
  tenantId: string,
  since: string,
) {
  const { data } = await sb
    .from('teacher_attendance')
    .select('id, status, marked_at, teacher_id, teachers(first_name, last_name), occurrence_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('marked_at', since)
    .order('marked_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getAttendanceForEffectiveness(
  sb: App.Locals['srv'],
  tenantId: string,
  limit: number,
) {
  const { data } = await sb
    .from('teacher_attendance')
    .select('id, status, marked_at, occurrence_id, teacher_id')
    .eq('tenant_id', tenantId)
    .limit(limit);
  return data ?? [];
}

export function computeAttendanceRate(attendance: { status?: string }[]): number {
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  return total ? Math.round((present / total) * 100) : 0;
}
