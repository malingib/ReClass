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

  // Count + revenue in parallel (count respects search/channel)
  const countAndRevenue = (async () => {
    let cq = locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId!).eq('status', 'paid');
    if (channel === 'mpesa') cq = cq.eq('domain', 'remedial');
    else if (channel === 'bank') cq = cq.eq('domain', 'school');
    if (cleanSearch) {
      // search on receipt/phone fields (join search on student is handled via or on receipt_no/phone — keep server fast)
      cq = cq.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%,bank_reference.ilike.%${cleanSearch}%`);
    }
    const { count } = await cq;
    return count ?? 0;
  })();

  const [{ data: revenue }, total, { data: payments }, { data: checkouts }, mpesaTotal, bankTotal] = await Promise.all([
    locals.srv.from('payments').select('amount').eq('tenant_id', locals.tenantId!).gte('created_at', yearStart).eq('status', 'paid'),
    countAndRevenue,
    (async () => {
      let q = locals.srv
        .from('payments')
        .select(`id, amount, method, domain, bank_reference, receipt_no, created_at, students!inner(first_name, last_name, admission_no, grade), fee_types(name)`)
        .eq('tenant_id', locals.tenantId!)
        .eq('status', 'paid');
      if (channel === 'mpesa') q = q.eq('domain', 'remedial');
      else if (channel === 'bank') q = q.eq('domain', 'school');
      if (cleanSearch) q = q.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%,bank_reference.ilike.%${cleanSearch}%`);
      q = q.order(sortCol, { ascending: asc }).range(offset, offset + PAGE_SIZE - 1);
      return q;
    })(),
    locals.srv.from('checkout_requests').select('id, phone, amount, status, reason, created_at').eq('tenant_id', locals.tenantId!).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(20),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId!).eq('status', 'paid').eq('domain', 'remedial').then(r => r.count ?? 0),
    locals.srv.from('payments').select('*', { count: 'exact', head: true }).eq('tenant_id', locals.tenantId!).eq('status', 'paid').eq('domain', 'school').then(r => r.count ?? 0),
  ]);

  const totalRevenue = revenue?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  const paymentData = (payments ?? []).map((p: any) => ({
    ...p,
    student_name: `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim() || '—',
    admission_no: p.students?.admission_no ?? '—',
    grade: p.students?.grade ?? '—',
    fee_type: p.fee_types?.name ?? '—',
  }));

  return {
    totalRevenue,
    payments: paymentData,
    checkouts: checkouts ?? [],
    stats: { mpesa: mpesaTotal, bank: bankTotal, total },
    pagination: { total, page, pageSize: PAGE_SIZE, search, sortKey: sortCol, sortDir: sortDir as 'asc' | 'desc', channel },
  };
};
