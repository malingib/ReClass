import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getTeacherOwnership } from '$lib/server/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const through = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [{ data: timetable }, { data: occurrences }] = await Promise.all([
    locals.srv
      .from('sessions')
      .select('id, class, day_of_week, start_time, end_time, room, subjects(name)')
      .eq('tenant_id', tenantId)
      .eq('teacher_id', teacher.id)
      .eq('active', true)
      .order('day_of_week'),
    locals.srv
      .from('session_occurrences')
      .select('id, occurs_on, start_time, end_time, room, class, status, sessions!inner(subjects(name)), teacher_attendance(id, status, marked_at, approval_status, review_note)')
      .eq('tenant_id', tenantId)
      .eq('teacher_id', teacher.id)
      .gte('occurs_on', from)
      .lte('occurs_on', through)
      .order('occurs_on')
      .order('start_time'),
  ]);

  const delivery = (occurrences ?? []).map((occurrence) => ({
    ...occurrence,
    subject: occurrence.sessions?.subjects?.name ?? '',
    attendance: occurrence.teacher_attendance?.[0] ?? null,
  }));

  return {
    stats: {
      sessions: timetable?.length ?? 0,
      pending: delivery.filter((item) => item.attendance?.approval_status === 'pending').length,
    },
    teacher,
    timetable: timetable ?? [],
    occurrences: delivery,
  };
};

export const actions = {
  mark: async ({ locals, request }) => {
    const { user, tenantId, teacher } = await getTeacherOwnership(locals);
    const form = await request.formData();
    const occurrenceId = form.get('occurrence_id')?.toString();
    const status = form.get('status')?.toString();
    if (!occurrenceId || !status || !['present', 'late'].includes(status)) {
      return fail(400, { error: 'Occurrence and a valid delivery status are required' });
    }

    const { data, error } = await locals.srv.rpc('mark_own_teacher_attendance', {
      p_tenant_id: tenantId,
      p_teacher_id: teacher.id,
      p_profile_id: user.id,
      p_occurrence_id: occurrenceId,
      p_status: status,
    });
    if (error) return fail(500, { error: 'Unable to submit teacher attendance' });
    const result = data as { status?: string } | null;
    if (result?.status !== 'pending') {
      return fail(result?.status === 'forbidden' || result?.status === 'not_assigned' ? 403 : 400, {
        error: result?.status === 'already_approved'
          ? 'Approved attendance cannot be changed'
          : 'This occurrence cannot be marked',
      });
    }

    return { success: true };
  },
} satisfies Actions;
