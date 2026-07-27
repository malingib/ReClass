import { paginatedQuery } from './query';

// Columns the student list may be sorted by (allowlist — never trust raw input).
const STUDENT_SORT_COLUMNS = new Set(['admission_no', 'first_name', 'grade', 'status', 'created_at']);
const STUDENT_SEARCH_COLUMNS = ['admission_no', 'first_name', 'last_name', 'grade'];

export async function getStudentsByTenant(
  sb: App.Locals['srv'],
  tenantId: string,
  opts: { page?: number; pageSize?: number; search?: string; sortKey?: string | null; sortDir?: 'asc' | 'desc' } = {},
) {
  const sortColumn = opts.sortKey && STUDENT_SORT_COLUMNS.has(opts.sortKey) ? opts.sortKey : 'created_at';
  const ascending = opts.sortKey ? opts.sortDir !== 'desc' : false;
  return paginatedQuery<Record<string, unknown>>(sb, 'students', tenantId, {
    select: 'id, admission_no, first_name, last_name, grade, status, created_at',
    order: { column: sortColumn, ascending },
    page: opts.page,
    pageSize: opts.pageSize,
    search: opts.search ? { term: opts.search, columns: STUDENT_SEARCH_COLUMNS } : undefined,
  });
}

export async function getRecentRemedialStudents(sb: App.Locals['srv'], tenantId: string, limit: number) {
  // Students enrolled in at least one remedial group (via group_members),
  // surfaced on the remedial dashboard — not the whole-school roster.
  const { data } = await sb
    .from('group_members')
    .select('student_id, students(id, admission_no, first_name, last_name, grade, created_at)')
    .eq('tenant_id', tenantId)
    .order('enrolled_at', { ascending: false })
    .limit(limit);
  const rows = (data ?? []).map((r: any) => r.students).filter(Boolean);
  // de-dupe by id (a student may be in multiple groups)
  const seen = new Set<string>();
  return rows.filter((s: any) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

export async function getRecentStudents(sb: App.Locals['srv'], tenantId: string, limit: number) {
  const { data } = await sb
    .from('students')
    .select('id, admission_no, first_name, last_name, grade, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getStudentList(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('students')
    .select('id, admission_no, first_name, last_name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('first_name');
  return data ?? [];
}
