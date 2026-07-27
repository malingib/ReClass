import type { PageServerLoad } from './$types';
import { getInvoiceCounts } from '$lib/server/invoices';
import { EXPORT_BURSA_MAX_ROWS } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const counts = await getInvoiceCounts(locals.srv, locals.tenantId);

  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();
  const [{ data: revenue }, { data: invoices }, { data: checkouts }] = await Promise.all([
    locals.srv.from('payments').select('amount').eq('tenant_id', locals.tenantId).gte('created_at', yearStart).eq('status', 'paid'),
    locals.srv.from('invoices').select(`
      id, amount_due, amount_paid, status, due_date, created_at,
      students!inner(first_name, last_name, admission_no, grade)
    `).eq('tenant_id', locals.tenantId).order('created_at', { ascending: false }).limit(EXPORT_BURSA_MAX_ROWS),
    locals.srv.from('checkout_requests').select('id, invoice_id, phone, amount, status, reason, created_at').eq('tenant_id', locals.tenantId).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(20),
  ]);

  const totalRevenue = revenue?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  const invoiceData = (invoices ?? []).map((i) => ({
    ...i,
    student_name: `${i.students?.first_name ?? ''} ${i.students?.last_name ?? ''}`.trim() || '—',
    admission_no: i.students?.admission_no ?? '—',
    grade: i.students?.grade ?? '—',
  }));

  const statusCounts: Record<string, number> = {};
  let totalDue = 0, totalPaid = 0;
  for (const inv of invoiceData) {
    const s = inv.status ?? 'unknown';
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    totalDue += Number(inv.amount_due);
    totalPaid += Number(inv.amount_paid);
  }

  return {
    stats: { invoices: counts.total, paid: counts.paid, unpaid: counts.unpaid },
    totalRevenue,
    invoices: invoiceData,
    statusCounts,
    totalDue,
    totalPaid,
    outstanding: totalDue - totalPaid,
    checkouts: checkouts ?? [],
  };
};
