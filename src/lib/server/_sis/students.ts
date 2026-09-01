import { paginatedQuery } from '../_platform/query';

const STUDENT_SORT_COLUMNS = new Set(['admission_no', 'first_name', 'grade', 'status', 'created_at']);
const STUDENT_SEARCH_COLUMNS = ['admission_no', 'first_name', 'last_name', 'grade'];

export async function getStudentsByTenant(
  sb: App.Locals['srv'], tenantId: string,
  opts: { page?: number; pageSize?: number; search?: string; sortKey?: string | null; sortDir?: 'asc' | 'desc'; balance?: 'all' | 'outstanding' | 'clear' } = {},
) {
  const sortColumn = opts.sortKey && STUDENT_SORT_COLUMNS.has(opts.sortKey) ? opts.sortKey : 'created_at';
  const ascending = opts.sortKey ? opts.sortDir !== 'desc' : false;
  let balanceIds: string[] | null = null;
  if (opts.balance && opts.balance !== 'all') {
    const { data: invoices } = await sb.from('invoices').select('student_id,amount_due,amount_paid').eq('tenant_id',tenantId).is('deleted_at',null);
    const totals = new Map<string,number>();
    for (const i of invoices ?? []) totals.set(i.student_id,(totals.get(i.student_id) ?? 0) + Number(i.amount_due ?? 0) - Number(i.amount_paid ?? 0));
    balanceIds = [...totals.entries()].filter(([,v]) => opts.balance === 'outstanding' ? v > 0 : v <= 0).map(([id]) => id);
  }
  const result = await paginatedQuery<Record<string, unknown>>(sb, 'students', tenantId, {
    select: 'id, admission_no, first_name, last_name, grade, status, created_at', order: { column: sortColumn, ascending }, page: opts.page, pageSize: opts.pageSize,
    filters: (q) => { let r=q.is('deleted_at',null); if(balanceIds) r=balanceIds.length ? r.in('id',balanceIds) : r.in('id',['00000000-0000-0000-0000-000000000000']); return r; },
    search: opts.search ? { term: opts.search, columns: STUDENT_SEARCH_COLUMNS } : undefined,
  });
  const ids=(result.data as any[]).map(s=>s.id);
  const { data: invoices } = ids.length ? await sb.from('invoices').select('student_id,amount_due,amount_paid').eq('tenant_id',tenantId).is('deleted_at',null).in('student_id',ids) : { data: [] };
  const totals=new Map<string,number>(); for(const i of invoices ?? []) totals.set(i.student_id,(totals.get(i.student_id) ?? 0)+Number(i.amount_due ?? 0)-Number(i.amount_paid ?? 0));
  return { ...result, data: (result.data as any[]).map(s=>({ ...s, balance: totals.get(s.id) ?? 0 })) };
}

export async function getRecentRemedialStudents(sb: App.Locals['srv'], tenantId: string, limit: number) { return getRecentStudents(sb, tenantId, limit); }
export async function getRecentStudents(sb: App.Locals['srv'], tenantId: string, limit: number) {
  const { data }=await sb.from('students').select('id, admission_no, first_name, last_name, grade, created_at').eq('tenant_id',tenantId).is('deleted_at',null).order('created_at',{ascending:false}).limit(limit); return data ?? [];
}
export async function getStudentList(sb: App.Locals['srv'], tenantId: string) {
  const { data }=await sb.from('students').select('id, admission_no, first_name, last_name').eq('tenant_id',tenantId).is('deleted_at',null).eq('status','active').order('first_name'); return data ?? [];
}
