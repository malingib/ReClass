import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: attendance } = await locals.supabase
    .from('teacher_attendance')
    .select('id, status, marked_at')
    .order('marked_at', { ascending: false })
    .limit(50);

  return { attendance: attendance ?? [] };
};
