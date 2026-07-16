import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const sb = locals.srv;

  const { data: invoices } = await sb
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, status, due_date, created_at,
      students!inner(first_name, last_name, admission_no, grade)
    `)
    .eq('tenant_id', locals.tenantId)
    .order('created_at', { ascending: false })
    .limit(10000);

  if (!invoices) {
    error(500, 'Failed to fetch invoice data');
  }

  const headers = ['Student Name', 'Admission No', 'Grade', 'Amount Due (KES)', 'Amount Paid (KES)', 'Balance (KES)', 'Status', 'Due Date', 'Created At'];
  const rows = invoices.map((r: any) => {
    const due = Number(r.amount_due);
    const paid = Number(r.amount_paid);
    return [
      `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`,
      r.students?.admission_no ?? '',
      r.students?.grade ?? '',
      due.toFixed(2),
      paid.toFixed(2),
      (due - paid).toFixed(2),
      r.status,
      r.due_date ?? '',
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map((r: any) => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="all-invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
