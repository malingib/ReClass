import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: attendance } = await locals.srv
    .from('teacher_attendance')
    .select('id, status, marked_at, teacher_id, occurrence_id, teachers(first_name, last_name)')
    .eq('tenant_id', locals.tenantId)
    .order('marked_at', { ascending: false })
    .limit(100);

  return {
    attendance: (attendance ?? []).map((row: any) => ({
      ...row,
      teacher_name: row.teachers ? `${row.teachers.first_name} ${row.teachers.last_name}` : 'Unknown',
      date: row.marked_at,
    })),
  };
};
