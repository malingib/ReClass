import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';
import { hasCapability, canApproveAttendance, canRunPayroll, canAuthorizePayout } from '$lib/server/_auth/capabilities';
import type { Capability } from '$lib/server/_auth/capabilities';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  const caps = (locals as App.Locals & { capabilities?: Capability[] }).capabilities ?? [];
  const committeeRole = (teacher as { remedial_role?: string | null }).remedial_role ?? 'none';
  const canRemedial = hasCapability(locals.role, teacher.teacher_type, 'remedial:view');
  const canSis = hasCapability(locals.role, teacher.teacher_type, 'sis:view');
  const canReviewAttendance = canApproveAttendance(committeeRole) || hasCapability(locals.role, teacher.teacher_type, 'remedial:attendance_review');
  const canPayroll = canRunPayroll(committeeRole);
  const canPayout = canAuthorizePayout(committeeRole);
  const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const through = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

  const [{ data: timetable }, { data: occurrences }, { data: announcements }, { data: homeroomClasses }] = await Promise.all([
    canRemedial ? locals.srv.from('sessions').select('id,class,day_of_week,start_time,end_time,room,subjects(name)').eq('tenant_id', tenantId).eq('teacher_id', teacher.id).eq('active', true).order('day_of_week') : Promise.resolve({ data: [] as unknown[], error: null }),
    canRemedial ? locals.srv.from('session_occurrences').select('id,occurs_on,start_time,end_time,room,class,status,sessions!inner(subjects(name)),teacher_attendance(id,status,marked_at,approval_status,review_note)').eq('tenant_id', tenantId).eq('teacher_id', teacher.id).gte('occurs_on', from).lte('occurs_on', through).order('occurs_on').order('start_time') : Promise.resolve({ data: [] as unknown[], error: null }),
    locals.srv.from('comm_announcements').select('id,title,body,audience,priority,published_at').eq('tenant_id', tenantId).eq('status', 'published').or('audience.eq.all,audience.eq.teachers').order('published_at', { ascending: false }).limit(10),
    canSis ? locals.srv.from('sis_classes').select('id').eq('tenant_id', tenantId).eq('homeroom_teacher_id', teacher.id).eq('status', 'active') : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  const delivery = ((occurrences ?? []) as Record<string, unknown>[]).map((occurrence) => ({
    ...occurrence,
    subject: (occurrence.sessions as { subjects?: { name?: string } } | undefined)?.subjects?.name ?? '',
    attendance: (occurrence.teacher_attendance as Record<string, unknown>[] | undefined)?.[0] ?? null,
  }));

  return {
    capabilities: caps,
    teacherType: teacher.teacher_type,
    committeeRole,
    canRemedial,
    canSis,
    canReviewAttendance,
    canPayroll,
    canPayout,
    stats: {
      sessions: timetable?.length ?? 0,
      pending: delivery.filter((item) => (item.attendance as { approval_status?: string } | null)?.approval_status === 'pending').length,
    },
    homeroomCount: homeroomClasses?.length ?? 0,
    teacher,
    timetable: timetable ?? [],
    occurrences: delivery,
    announcements: announcements ?? [],
  };
};

export const actions = {
  mark: async ({ locals, request }) => {
    const { user, tenantId, teacher } = await getTeacherOwnership(locals);
    if (!hasCapability(locals.role, teacher.teacher_type, 'remedial:attendance_mark')) return fail(403, { error: 'You do not have permission to mark teacher attendance' });
    const form = await request.formData();
    const occurrenceId = form.get('occurrence_id')?.toString();
    const status = form.get('status')?.toString();
    if (!occurrenceId || !status || !['attended', 'absent'].includes(status)) return fail(400, { error: 'Occurrence and attendance status are required' });
    const { data, error } = await locals.srv.rpc('mark_own_teacher_attendance', {
      p_tenant_id: tenantId, p_teacher_id: teacher.id, p_profile_id: user.id, p_occurrence_id: occurrenceId, p_status: status,
    });
    if (error) return fail(500, { error: 'Unable to submit teacher attendance' });
    const result = data as { status?: string } | null;
    if (result?.status !== 'pending') return fail(result?.status === 'forbidden' || result?.status === 'not_assigned' ? 403 : 400, { error: result?.status === 'already_approved' ? 'Approved attendance cannot be changed' : 'This occurrence cannot be marked' });
    return { success: true };
  },
} satisfies Actions;
