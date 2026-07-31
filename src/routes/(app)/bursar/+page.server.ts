import type { PageServerLoad } from './$types';
import { EXPORT_BURSA_MAX_ROWS } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();
  const [{ data: revenue }, { data: payments }, { data: checkouts }] = await Promise.all([
    locals.srv.from('payments').select('amount').eq('tenant_id', locals.tenantId).gte('created_at', yearStart).eq('status', 'paid'),
    locals.srv.from('payments').select(`
      id, amount, method, domain, bank_reference, receipt_no, created_at,
      students!inner(first_name, last_name, admission_no, grade),
      fee_types(name)
    `).eq('tenant_id', locals.tenantId).order('created_at', { ascending: false }).limit(EXPORT_BURSA_MAX_ROWS),
    locals.srv.from('checkout_requests').select('id, phone, amount, status, reason, created_at').eq('tenant_id', locals.tenantId).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(20),
  ]);

  const totalRevenue = revenue?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  const paymentData = (payments ?? []).map((p) => ({
    ...p,
    student_name: `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim() || '—',
    admission_no: p.students?.admission_no ?? '—',
    grade: p.students?.grade ?? '—',
    fee_type: p.fee_types?.name ?? '—',
  }));

  return {
    stats: { payments: paymentData.length, revenue: totalRevenue },
    totalRevenue,
    payments: paymentData,
    checkouts: checkouts ?? [],
  };
};
