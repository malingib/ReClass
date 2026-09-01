import type { PageServerLoad } from './$types';
import { PAGE_LIST_MEDIUM } from '$lib/config';

const BURSAR_SORT = new Set(['created_at', 'amount', 'receipt_no']);
const PAGE_SIZE = PAGE_LIST_MEDIUM;

export const load: PageServerLoad = async ({ locals, url }) => {
  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const search = (url.searchParams.get('search') ?? '').trim();
  const sortKey = url.searchParams.get('sort') ?? 'created_at';
  const sortDir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const channel = url.searchParams.get('channel') ?? 'all';
  const sortCol = BURSAR_SORT.has(sortKey) ? sortKey : 'created_at';
  const asc = sortDir === 'asc';
  const offset = (page - 1) * PAGE_SIZE;
  const cleanSearch = search.replace(/[,()]/g, '').replace(/%/g, '\\%');

  const applySchoolScope = (q: any) => {
    let scoped = q.eq('tenant_id', locals.tenantId!).eq('status', 'paid').eq('domain', 'school');
    if (channel === 'mpesa') scoped = scoped.eq('method', 'mpesa');
    else if (channel === 'bank') scoped = scoped.eq('method', 'bank');
    if (cleanSearch) scoped = scoped.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%,bank_reference.ilike.%${cleanSearch}%`);
    return scoped;
  };

  const [{ data: revenue }, { count: total }, { data: payments }, { data: checkouts }] = await Promise.all([
    locals.srv.from('payments').select('amount').eq('tenant_id', locals.tenantId!).eq('status', 'paid').eq('domain', 'school').gte('created_at', yearStart),
    applySchoolScope(locals.srv.from('payments').select('*', { count: 'exact', head: true })),
    (async () => {
      let q = applySchoolScope(locals.srv.from('payments').select(`id, amount, method, domain, bank_reference, mpesa_receipt, receipt_no, created_at, students!inner(first_name, last_name, admission_no, grade), fee_types(name)`));
      q = q.order(sortCol, { ascending: asc }).range(offset, offset + PAGE_SIZE - 1);
      return q;
    })(),
    locals.srv.from('checkout_requests').select('id, phone, amount, status, reason, created_at').eq('tenant_id', locals.tenantId!).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(20),
  ]);

  const totalRevenue = revenue?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const paymentData = (payments ?? []).map((p: any) => ({
    ...p,
    student_name: `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim() || '—',
    admission_no: p.students?.admission_no ?? '—',
    grade: p.students?.grade ?? '—',
    fee_type: p.fee_types?.name ?? '—',
  }));

  const mpesaCount = paymentData.filter((p: any) => p.method === 'mpesa').length;
  const bankCount = paymentData.filter((p: any) => p.method === 'bank').length;

  return {
    totalRevenue,
    payments: paymentData,
    checkouts: checkouts ?? [],
    stats: { mpesa: mpesaCount, bank: bankCount, total: total ?? 0 },
    pagination: { total: total ?? 0, page, pageSize: PAGE_SIZE, search, sortKey: sortCol, sortDir: sortDir as 'asc' | 'desc', channel },
  };
};
