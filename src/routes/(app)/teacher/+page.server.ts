import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { count: students } = await locals.supabase.from('students').select('*', { count: 'exact', head: true });
  const { data: timetable } = await locals.supabase.from('sessions').select('id, title, subject, grade, start_time, end_time, day_of_week').order('day_of_week');
  const { data: attendance } = await locals.supabase.from('teacher_attendance').select('status, marked_at').gte('marked_at', since);

  const total = attendance?.length ?? 0;
  const present = attendance?.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return { stats: { students: students ?? 0, attendanceRate: rate, sessions: timetable?.length ?? 0 }, timetable: timetable ?? [], attendance: attendance ?? [] };
};
