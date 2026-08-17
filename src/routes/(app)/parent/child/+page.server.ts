import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);

  if (studentIds.length === 0) return { parent, students: [], enrollments: [], payments: [] };

  const [{ data: students }, { data: enrollments }, { data: payments }] = await Promise.all([
    locals.srv
      .from('students')
      .select('id, admission_no, first_name, last_name, grade, status')
      .eq('tenant_id', tenantId)
      .in('id', studentIds),
    locals.srv
      .from('sis_enrollments')
      .select('id, student_id, class_id, academic_year, status, enrolled_at, exited_at, sis_classes(name, stream, code)')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    locals.srv
      .from('payments')
      .select('id, student_id, amount, domain, fee_types(name), created_at')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return {
    parent,
    students: students ?? [],
    enrollments: enrollments ?? [],
    payments: (payments ?? []).map((p) => ({
      ...p,
      fee_type: (p.fee_types as { name?: string } | null)?.name ?? '—',
    })),
  };
};
