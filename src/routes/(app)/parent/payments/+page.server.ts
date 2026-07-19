import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { invoices: [] };

  const { data: invoices } = await locals.srv
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, created_at, students(first_name, last_name, admission_no)')
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(50);

  return { invoices: invoices ?? [] };
};
