import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { parent, invoices: [] };

  const { data: invoices } = await locals.srv
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, students(first_name, last_name, admission_no)')
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .in('status', ['unpaid', 'partial'])
    .order('due_date');

  return { parent, invoices: invoices ?? [] };
};
