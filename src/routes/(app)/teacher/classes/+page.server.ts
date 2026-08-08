import type { PageServerLoad } from './$types';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);

  const { data: classes } = await locals.srv
    .from('sis_classes')
    .select('id, name, stream, code, academic_year, status')
    .eq('tenant_id', tenantId)
    .eq('homeroom_teacher_id', teacher.id)
    .order('name');

  const classIds = (classes ?? []).map((c: { id: string }) => c.id);
  let enrollments: unknown[] = [];
  if (classIds.length > 0) {
    const { data } = await locals.srv
      .from('sis_enrollments')
      .select('id, class_id, academic_year, status, enrolled_at, students(first_name, last_name, admission_no, grade)')
      .eq('tenant_id', tenantId)
      .in('class_id', classIds)
      .eq('status', 'active')
      .order('enrolled_at');
    enrollments = data ?? [];
  }

  return {
    teacher,
    classes: classes ?? [],
    enrollments,
  };
};
