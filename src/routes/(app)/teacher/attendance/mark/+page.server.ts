// @ts-nocheck
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // Find the teacher record for this user
  const db = locals.srv;
  const { data: teacher } = await db
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!teacher) {
    return {
      sessions: [],
      groups: [],
      teacher: null,
      existingAttendance: {},
    };
  }

  // Find today's date
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const supabaseDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  // No group lookup needed — sessions are class-scoped and filtered by teacher_id above.

  // Get the teacher's sessions for today (sessions are class-scoped, not group-scoped)
  const { data: sessions } = await db
    .from('sessions')
    .select('id, class, day_of_week, start_time, end_time, subject_id, subjects!inner(name)')
    .eq('teacher_id', teacher.id)
    .eq('day_of_week', supabaseDay)
    .eq('active', true);

  const sessionIds = (sessions ?? []).map(s => s.id);

  // Get or create today's occurrences
  const { data: existingOccurrences } = await db
    .from('session_occurrences')
    .select('id, session_id')
    .in('session_id', sessionIds)
    .eq('occurs_on', today);

  const existingSessionIds = new Set((existingOccurrences ?? []).map(o => o.session_id));

  // Create missing occurrences
  const toCreate = (sessions ?? []).filter(s => !existingSessionIds.has(s.id));
  const createdIds: Record<string, string> = {};

  for (const s of toCreate) {
    const { data: created } = await db
      .from('session_occurrences')
      .insert({
        session_id: s.id,
        occurs_on: today,
        start_time: s.start_time,
        end_time: s.end_time,
        status: 'scheduled',
      })
      .select('id, session_id')
      .single();
    if (created) {
      createdIds[created.session_id] = created.id;
    }
  }

  // Build occurrence map: session_id -> occurrence_id
  const occurrenceMap: Record<string, string> = {};
  for (const o of existingOccurrences ?? []) {
    occurrenceMap[o.session_id] = o.id;
  }
  Object.assign(occurrenceMap, createdIds);

  // Build the enriched sessions list
  const enrichedSessions = (sessions ?? []).map(s => ({
    ...s,
    occurrence_id: occurrenceMap[s.id] ?? null,
  })).filter(s => s.occurrence_id);

  // Build the roster per session: students in the same grade (class) as the session.
  const classBySession: Record<string, string> = {};
  for (const s of enrichedSessions) {
    classBySession[s.id] = (s as any).class;
  }
  const classes = [...new Set(Object.values(classBySession).filter(Boolean))];

  const studentsByClass: Record<string, any[]> = {};
  if (classes.length > 0) {
    const { data: classStudents } = await db
      .from('students')
      .select('id, first_name, last_name, admission_no, grade')
      .in('grade', classes)
      .order('first_name');
    for (const s of classStudents ?? []) {
      const g = s.grade ?? '';
      if (!studentsByClass[g]) studentsByClass[g] = [];
      studentsByClass[g].push({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        admission_no: s.admission_no,
      });
    }
  }

  // Map session_id -> roster (students in that session's class)
  const groupStudents: Record<string, any[]> = {};
  for (const [sessionId, cls] of Object.entries(classBySession)) {
    groupStudents[sessionId] = studentsByClass[cls ?? ''] ?? [];
  }

  return {
    sessions: enrichedSessions,
    teacher,
    groupStudents,
  };
};

export const actions: Actions = {
  mark: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const { data: teacher } = await locals.srv
      .from('teachers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!teacher) {
      return fail(403, { error: 'Teacher record not found' });
    }

    const formData = await request.formData();
    const occurrenceId = formData.get('occurrence_id') as string;
    const studentIdsJson = formData.get('student_ids') as string;
    const statusesJson = formData.get('statuses') as string;

    if (!occurrenceId || !studentIdsJson || !statusesJson) {
      return fail(400, { error: 'Missing required fields' });
    }

    const studentIds: string[] = JSON.parse(studentIdsJson);
    const statuses: Record<string, string> = JSON.parse(statusesJson);

    // Upsert attendance records
    const upserts = studentIds.map(studentId => {
      const status = statuses[studentId] || 'absent';
      return {
        occurrence_id: occurrenceId,
        student_id: studentId,
        status,
        marked_by: user.id,
      };
    });

    // Delete existing records for this occurrence and re-insert
    const { error: delError } = await locals.srv
      .from('attendance')
      .delete()
      .eq('occurrence_id', occurrenceId);

    if (delError) {
      return fail(500, { error: `Failed to clear existing attendance: ${delError.message}` });
    }

    const { error: insError } = await locals.srv
      .from('attendance')
      .insert(upserts);

    if (insError) {
      return fail(500, { error: `Failed to save attendance: ${insError.message}` });
    }

    return { success: true };
  },

  markAllPresent: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const formData = await request.formData();
    const occurrenceId = formData.get('occurrence_id') as string;
    const studentIdsJson = formData.get('student_ids') as string;

    if (!occurrenceId || !studentIdsJson) {
      return fail(400, { error: 'Missing required fields' });
    }

    const studentIds: string[] = JSON.parse(studentIdsJson);

    const upserts = studentIds.map(studentId => ({
      occurrence_id: occurrenceId,
      student_id: studentId,
      status: 'present',
      marked_by: user.id,
    }));

    const { error: delError } = await locals.srv
      .from('attendance')
      .delete()
      .eq('occurrence_id', occurrenceId);

    if (delError) {
      return fail(500, { error: `Failed to clear existing attendance: ${delError.message}` });
    }

    const { error: insError } = await locals.srv
      .from('attendance')
      .insert(upserts);

    if (insError) {
      return fail(500, { error: `Failed to save attendance: ${insError.message}` });
    }

    return { success: true };
  },
};
