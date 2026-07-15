import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: attendance } = await locals.supabase
    .from('teacher_attendance')
    .select('id, status, marked_at, teacher_id, session_id, group_name, subject, teachers(full_name)')
    .order('marked_at', { ascending: false })
    .limit(100);

  return {
    attendance: (attendance ?? []).map((row: any) => ({
      ...row,
      teacher_name: row.teachers?.full_name,
      date: row.marked_at,
    })),
  };
};
