// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: schedules } = await locals.supabase
    .from('sessions')
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      slot,
      active,
      group_id,
      remedial_groups!inner (
        name,
        grade,
        room,
        subject_id,
        subjects!inner ( name )
      )
    `)
    .order('day_of_week');

  // Flatten to the Session interface the page expects
  const flat = (schedules ?? []).map((s: any) => ({
    id: s.id,
    title: s.remedial_groups?.name ?? '',
    subject: s.remedial_groups?.subjects?.name ?? '',
    grade: s.remedial_groups?.grade ?? '',
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.active ? 'active' : 'inactive',
  }));

  return { schedules: flat };
};
