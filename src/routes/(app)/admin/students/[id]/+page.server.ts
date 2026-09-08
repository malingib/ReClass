import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: student, error: studentError } = await locals.supabase
    .from('students')
    .select('id, admission_no, first_name, last_name, class_id, created_at')
    .eq('id', params.id)
    .single();

  const { data: events, error: eventsError } = await locals.srv
    .from('student_lifecycle_events')
    .select('id, event_type, event_date, notes, from_class_id, to_class_id, created_at')
    .eq('student_id', params.id)
    .order('event_date', { ascending: false });

  return {
    student: studentError ? null : student,
    events: eventsError ? [] : events ?? [],
    error: studentError?.message ?? null
  };
};
