import type { PageServerLoad } from './$types';
import { PAGE_LIST_MEDIUM } from '$lib/config';
import { requireTenantRole } from '$lib/server/_auth/auth';

const BURSAR_SORT = new Set(['created_at', 'amount', 'receipt_no']);
const PAGE_SIZE = PAGE_LIST_MEDIUM;

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'bursar', 'school_admin', 'super_admin');
  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const search = (url.searchParams.get('search') ?? '').trim();
  const sortKey = url.searchParams.get('sort') ?? 'created_at';
  const sortDir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const sortCol = BURSAR_SORT.has(sortKey) ? sortKey : 'created_at';
  const asc = sortDir === 'asc';
  const offset = (page - 1) * PAGE_SIZE;
  const cleanSearch = search.replace(/[,()]/g, '').replace(/%/g, '\\%');

  // Bursar owns the school-finance domain. Remedial M-Pesa operations remain
  // inside ReClass/remedial and are intentionally absent from this workspace.
  const countAndRevenue = (async () => {
    let cq = locals.srv
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('domain', 'school')
      .eq('status', 'paid');
    if (cleanSearch) {
      cq = cq.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%,bank_reference.ilike.%${cleanSearch}%`);
    }
    const { count } = await cq;
    return count ?? 0;
  })();

  const [{ data: revenue }, total, { data: payments }] = await Promise.all([
    locals.srv
      .from('payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('domain', 'school')
      .gte('created_at', yearStart)
      .eq('status', 'paid'),
    countAndRevenue,
    (async () => {
      let q = locals.srv
        .from('payments')
        .select('id, amount, method, domain, bank_reference, receipt_no, mpesa_receipt, created_at, students!inner(first_name, last_name, admission_no, grade), fee_types(name)')
        .eq('tenant_id', tenantId)
        .eq('domain', 'school')
        .eq('status', 'paid');
      if (cleanSearch) {
        q = q.or(`receipt_no.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,mpesa_receipt.ilike.%${cleanSearch}%,bank_reference.ilike.%${cleanSearch}%`);
      }
      q = q.order(sortCol, { ascending: asc }).range(offset, offset + PAGE_SIZE - 1);
      return q;
    })(),
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
    stats: { school: total },
    pagination: { total, page, pageSize: PAGE_SIZE, search, sortKey: sortCol, sortDir: sortDir as 'asc' | 'desc' },
  };
};