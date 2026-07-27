import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { parent, payments: [], recentInvoices: [] };

  const { data: invoices } = await locals.srv
    .from('invoices')
    .select('id, amount_due, amount_paid, status, due_date, created_at, students(first_name, last_name, admission_no)')
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  const invoiceIds = (invoices ?? []).map(i => i.id);

  const { data: payments } = invoiceIds.length > 0
    ? await locals.srv
        .from('payments')
        .select('id, invoice_id, amount, method, mpesa_receipt, phone, status, created_at')
        .eq('tenant_id', tenantId)
        .in('invoice_id', invoiceIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const invoiceMap = new Map((invoices ?? []).map(i => [i.id, i]));

  return {
    parent,
    payments: (payments ?? []).map((p) => {
      const inv = invoiceMap.get(p.invoice_id);
      const student = inv?.students;
      return {
        ...p,
        student_name: student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Unknown' : 'Unknown',
        admission_no: student?.admission_no ?? '—',
        invoice_amount_due: inv?.amount_due,
        invoice_status: inv?.status,
      };
    }),
    recentInvoices: invoices ?? [],
  };
};
