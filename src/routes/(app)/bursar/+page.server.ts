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
  const offset = (page - 1) * PAGE_SIZE;
  const cleanSearch = search.replace(/[,()]/g, '').replace(/%/g, '\\%');

  const countQuery = async () => {
    let query = locals.srv.from('payments').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('domain', 'school').eq('status', 'paid');
    if (cleanSearch) query = query.or('receipt_no.ilike.%' + cleanSearch + '%,phone.ilike.%' + cleanSearch + '%,mpesa_receipt.ilike.%' + cleanSearch + '%,bank_reference.ilike.%' + cleanSearch + '%');
    const { count } = await query;
    return count ?? 0;
  };

  const paymentsQuery = async () => {
    let query = locals.srv.from('payments')
      .select('id, amount, method, domain, bank_reference, receipt_no, mpesa_receipt, created_at, students!inner(first_name, last_name, admission_no, grade), fee_types(name)')
      .eq('tenant_id', tenantId).eq('domain', 'school').eq('status', 'paid');
    if (cleanSearch) query = query.or('receipt_no.ilike.%' + cleanSearch + '%,phone.ilike.%' + cleanSearch + '%,mpesa_receipt.ilike.%' + cleanSearch + '%,bank_reference.ilike.%' + cleanSearch + '%');
    return query.order(sortCol, { ascending: sortDir === 'asc' }).range(offset, offset + PAGE_SIZE - 1);
  };

  const [{ data: revenueData }, total, { data: payments }] = await Promise.all([
    locals.srv.rpc('sum_school_payments_since', { p_tenant_id: tenantId, p_since: yearStart }),
    countQuery(),
    paymentsQuery(),
  ]);

  const totalRevenue = Number(revenueData ?? 0);
  const paymentData = (payments ?? []).map((p: any) => ({
    ...p,
    student_name: ((p.students?.first_name ?? '') + ' ' + (p.students?.last_name ?? '')).trim() || '—',
    admission_no: p.students?.admission_no ?? '—',
    grade: p.students?.grade ?? '—',
    fee_type: p.fee_types?.name ?? '—',
  }));

  return { totalRevenue, payments: paymentData, stats: { school: total }, pagination: { total, page, pageSize: PAGE_SIZE, search, sortKey: sortCol, sortDir: sortDir as 'asc' | 'desc' } };
};
