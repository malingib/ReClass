// @ts-nocheck
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // Find the teacher record for this user
  const { data: teacher } = await locals.supabase
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

  // Get the teacher's groups
  const { data: groups } = await locals.supabase
    .from('remedial_groups')
    .select('id, name, subject, grade')
    .eq('teacher_id', teacher.id)
    .eq('status', 'active');

  const groupIds = (groups ?? []).map(g => g.id);

  if (groupIds.length === 0) {
    return {
      sessions: [],
      groups: groups ?? [],
      teacher,
      existingAttendance: {},
    };
  }

  // Get today's sessions for these groups
  const { data: sessions } = await locals.supabase
    .from('sessions')
    .select('id, group_id, day_of_week, start_time, end_time, slot, remedial_groups(name, subject, grade)')
    .in('group_id', groupIds)
    .eq('day_of_week', supabaseDay)
    .eq('active', true);

  const sessionIds = (sessions ?? []).map(s => s.id);

  // Get or create today's occurrences
  const { data: existingOccurrences } = await locals.supabase
    .from('session_occurrences')
    .select('id, session_id')
    .in('session_id', sessionIds)
    .eq('occurs_on', today);

  const existingSessionIds = new Set((existingOccurrences ?? []).map(o => o.session_id));

  // Create missing occurrences
  const toCreate = (sessions ?? []).filter(s => !existingSessionIds.has(s.id));
  const createdIds: Record<string, string> = {};

  for (const s of toCreate) {
    const { data: created } = await locals.supabase
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

  // Get enrolled students for each group via group_members
  // Since group_members may not exist, fall back to basic data
  const occurrenceIds = enrichedSessions.map(s => s.occurrence_id).filter(Boolean);

  // Get existing attendance records for today
  const { data: existingAttendance } = await locals.supabase
    .from('attendance')
    .select('id, student_id, occurrence_id, status')
    .in('occurrence_id', occurrenceIds);

  const attendanceMap: Record<string, Record<string, any>> = {};
  for (const a of existingAttendance ?? []) {
    if (!attendanceMap[a.occurrence_id]) attendanceMap[a.occurrence_id] = {};
    attendanceMap[a.occurrence_id][a.student_id] = a;
  }

  // Get students enrolled in each group
  // Attempt to use group_members, fallback to all students
  const { data: groupMembers } = await locals.supabase
    .from('group_members')
    .select('student_id, group_id, students(id, first_name, last_name, admission_no, grade)')
    .in('group_id', groupIds);

  // Build group -> students map
  const groupStudents: Record<string, any[]> = {};
  for (const gm of groupMembers ?? []) {
    if (!groupStudents[gm.group_id]) groupStudents[gm.group_id] = [];
    groupStudents[gm.group_id].push({
      id: gm.students?.id,
      first_name: gm.students?.first_name,
      last_name: gm.students?.last_name,
      admission_no: gm.students?.admission_no,
    });
  }

  return {
    sessions: enrichedSessions,
    groups: groups ?? [],
    teacher,
    existingAttendance: attendanceMap,
    groupStudents,
  };
};

export const actions: Actions = {
  mark: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const { data: teacher } = await locals.supabase
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
    const { error: delError } = await locals.supabase
      .from('attendance')
      .delete()
      .eq('occurrence_id', occurrenceId);

    if (delError) {
      return fail(500, { error: `Failed to clear existing attendance: ${delError.message}` });
    }

    const { error: insError } = await locals.supabase
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

    const { error: delError } = await locals.supabase
      .from('attendance')
      .delete()
      .eq('occurrence_id', occurrenceId);

    if (delError) {
      return fail(500, { error: `Failed to clear existing attendance: ${delError.message}` });
    }

    const { error: insError } = await locals.supabase
      .from('attendance')
      .insert(upserts);

    if (insError) {
      return fail(500, { error: `Failed to save attendance: ${insError.message}` });
    }

    return { success: true };
  },
};
