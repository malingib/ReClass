import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { PAGE_LIST_MEDIUM } from '$lib/config';

const PP_SORT = new Set(['created_at', 'amount']);
const PAGE_SIZE = PAGE_LIST_MEDIUM;

export const load: PageServerLoad = async ({ locals, url }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const search = (url.searchParams.get('search') ?? '').trim();
  const sortKey = url.searchParams.get('sort') ?? 'created_at';
  const sortDir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const channel = url.searchParams.get('channel') ?? 'all';
  const sortCol = PP_SORT.has(sortKey) ? sortKey : 'created_at';
  const asc = sortDir === 'asc';
  const offset = (page - 1) * PAGE_SIZE;
  const cleanSearch = search.replace(/[,()]/g, '').replace(/%/g, '\\%');

  const buildFilters = (q: any) => {
    let r = q.eq('tenant_id', locals.tenantId!).eq('status', 'paid').is('deleted_at', null);
    if (channel === 'mpesa') r = r.eq('domain', 'remedial');
    else if (channel === 'bank') r = r.eq('domain', 'school');
    if (cleanSearch) r = r.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%`);
    return r;
  };

  const [{ count: total }, { count: totalStudents }, payRes, mpesaCnt, bankCnt] = await Promise.all([
    buildFilters(locals.srv.from('payments').select('*', { count: 'exact', head: true })),
    locals.srv.from('students').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId!).then(r => r as any),
    (async () => {
      let q: any = locals.srv
        .from('payments')
        .select(`id, amount, method, domain, mpesa_receipt, phone, status, receipt_no, created_at, students(first_name, last_name, admission_no, grade), fee_types(name)`)
        .eq('tenant_id', locals.tenantId!)
        .eq('status', 'paid')
        .is('deleted_at', null);
      if (channel === 'mpesa') q = q.eq('domain', 'remedial');
      else if (channel === 'bank') q = q.eq('domain', 'school');
      if (cleanSearch) q = q.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%`);
      q = q.order(sortCol, { ascending: asc }).range(offset, offset + PAGE_SIZE - 1);
      return q;
    })(),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId!).eq('status', 'paid').is('deleted_at', null).eq('domain', 'remedial').then(r => (r as any).count ?? 0),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId!).eq('status', 'paid').is('deleted_at', null).eq('domain', 'school').then(r => (r as any).count ?? 0),
  ]);

  const payments = (payRes as any).data ?? [];
  const paymentData = payments.map((p: any) => ({
    ...p,
    student_name: p.students ? `${p.students.first_name} ${p.students.last_name}` : '—',
    admission_no: p.students?.admission_no ?? '—',
    grade: p.students?.grade ?? '—',
    fee_type: p.fee_types?.name ?? '—',
  }));

  return {
    payments: paymentData,
    stats: { totalStudents: totalStudents ?? 0, paid: mpesaCnt, unpaid: bankCnt, totalReceipts: total ?? 0 },
    pagination: { total: total ?? 0, page, pageSize: PAGE_SIZE, search, sortKey: sortCol, sortDir: sortDir as 'asc' | 'desc', channel },
  };
};
