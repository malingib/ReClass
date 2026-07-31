import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { parent, students: [], feeTypes: [] };

  const [{ data: students }, { data: feeTypes }] = await Promise.all([
    locals.srv
      .from('students')
      .select('id, admission_no, first_name, last_name, grade')
      .eq('tenant_id', tenantId)
      .in('id', studentIds)
      .order('first_name'),
    locals.srv
      .from('fee_types')
      .select('id, name, amount, domain, due_date, term')
      .eq('tenant_id', tenantId)
      .eq('domain', 'school')
      .order('name'),
  ]);

  return { parent, students: students ?? [], feeTypes: feeTypes ?? [] };
};
