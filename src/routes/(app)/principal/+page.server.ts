import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { count: students } = await locals.supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: teachers } = await locals.supabase.from('teachers').select('*', { count: 'exact', head: true });
  const { data: attendance } = await locals.supabase.from('teacher_attendance').select('status, marked_at').gte('marked_at', since);
  const { data: groups } = await locals.supabase.from('remedial_groups').select('id, name, status');

  const total = attendance?.length ?? 0;
  const present = attendance?.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return { stats: { students: students ?? 0, teachers: teachers ?? 0, attendanceRate: rate, groups: groups?.length ?? 0 }, groups: groups ?? [] };
};
