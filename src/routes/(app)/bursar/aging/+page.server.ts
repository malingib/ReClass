import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const now = new Date();
  const { data: invoices } = await locals.srv
    .from('invoices')
    .select('id, amount_due, amount_paid, due_date, status, created_at, students(first_name, last_name, admission_no)')
    .eq('tenant_id', locals.tenantId)
    .not('status', 'eq', 'paid')
    .not('status', 'eq', 'waived')
    .order('due_date', { ascending: true });

  const aging = (invoices ?? []).map((inv: any) => {
    const student = Array.isArray(inv.students) ? inv.students[0] : inv.students;
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    const daysOverdue = dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / 864e5) : 0;
    const bucket = daysOverdue <= 0 ? 'current'
      : daysOverdue <= 30 ? '1–30 days'
      : daysOverdue <= 60 ? '31–60 days'
      : daysOverdue <= 90 ? '61–90 days'
      : '90+ days';
    const outstanding = Number(inv.amount_due) - Number(inv.amount_paid ?? 0);

    return {
      id: inv.id,
      student_name: student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : 'Unknown',
      admission_no: student?.admission_no ?? '—',
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid ?? 0,
      outstanding,
      due_date: inv.due_date,
      daysOverdue: Math.max(0, daysOverdue),
      bucket,
      status: inv.status,
    };
  });

  // Bucket summaries
  const buckets = {
    current: aging.filter((a: any) => a.bucket === 'current').reduce((s: number, a: any) => s + a.outstanding, 0),
    '1–30 days': aging.filter((a: any) => a.bucket === '1–30 days').reduce((s: number, a: any) => s + a.outstanding, 0),
    '31–60 days': aging.filter((a: any) => a.bucket === '31–60 days').reduce((s: number, a: any) => s + a.outstanding, 0),
    '61–90 days': aging.filter((a: any) => a.bucket === '61–90 days').reduce((s: number, a: any) => s + a.outstanding, 0),
    '90+ days': aging.filter((a: any) => a.bucket === '90+ days').reduce((s: number, a: any) => s + a.outstanding, 0),
  } as Record<string, number>;
  const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);

  return { aging, buckets, totalOutstanding };
};
