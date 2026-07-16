import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const sb = locals.supabase;

  const { data: invoices } = await sb
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, status, due_date, created_at,
      students!inner(first_name, last_name, admission_no, grade)
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(10000);

  if (!invoices) {
    error(500, 'Failed to fetch revenue data');
  }

  const headers = ['Student', 'Admission No', 'Grade', 'Amount Due', 'Amount Paid', 'Status', 'Due Date', 'Created At'];
  const rows = invoices.map((r: any) => [
    `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`,
    r.students?.admission_no ?? '',
    r.students?.grade ?? '',
    r.amount_due,
    r.amount_paid,
    r.status,
    r.due_date ?? '',
    r.created_at ? new Date(r.created_at).toISOString() : '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="revenue-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
