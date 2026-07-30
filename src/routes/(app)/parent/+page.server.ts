import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';
import { PAGE_OVERVIEW } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);

  if (studentIds.length === 0) return { parent, students: [], invoices: [] };

  const { data: students } = await locals.srv
    .from('students')
    .select('id, admission_no, first_name, last_name, grade, status')
    .eq('tenant_id', tenantId)
    .in('id', studentIds);

  const { data: invoices } = await locals.srv
    .from('invoices')
    .select('id, student_id, amount_due, amount_paid, status, due_date, students(first_name, last_name, admission_no)')
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .in('status', ['unpaid', 'partial'])
    .order('created_at', { ascending: false })
    .limit(PAGE_OVERVIEW);

  return { parent, students: students ?? [], invoices: invoices ?? [] };
};
