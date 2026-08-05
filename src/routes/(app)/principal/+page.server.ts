import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'principal');
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const db = locals.srv;

  const [studentsRes, teachersRes, sessionsRes, dueRes, deliveredRes, pendingRes] = await Promise.all([
    db.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    db.from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    db.from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    db.from('session_occurrences')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('occurs_on', since)
      .lte('occurs_on', today)
      .neq('status', 'cancelled'),
    db.from('teacher_attendance')
      .select('id, session_occurrences!inner(occurs_on)', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .in('status', ['present', 'late'])
      .gte('session_occurrences.occurs_on', since)
      .lte('session_occurrences.occurs_on', today),
    db.from('teacher_attendance')
      .select('id, status, marked_at, teachers(first_name, last_name), session_occurrences(occurs_on, start_time, end_time, room, class, sessions(subjects(name)))')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .is('deleted_at', null)
      .order('marked_at'),
  ]);

  const attendanceRate = dueRes.count ? Math.round(((deliveredRes.count ?? 0) / dueRes.count) * 100) : 0;

  return {
    stats: {
      students: studentsRes.count ?? 0,
      teachers: teachersRes.count ?? 0,
      attendanceRate,
      sessions: sessionsRes.count ?? 0,
    },
    pendingAttendance: pendingRes.data ?? [],
  };
};

export const actions = {
  review: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'principal');
    const form = await request.formData();
    const attendanceId = form.get('attendance_id')?.toString();
    const decision = form.get('decision')?.toString();
    const note = form.get('note')?.toString().trim() || undefined;
    if (!attendanceId || !decision || !['approved', 'rejected'].includes(decision)) {
      return fail(400, { error: 'Attendance and a valid review decision are required' });
    }
    if (decision === 'rejected' && !note) return fail(400, { error: 'A rejection reason is required' });

    const { data, error } = await locals.srv.rpc('review_teacher_attendance', {
      p_tenant_id: tenantId,
      p_profile_id: user.id,
      p_attendance_id: attendanceId,
      p_decision: decision,
      p_note: note,
    });
    if (error) return fail(500, { error: 'Unable to review attendance' });
    const result = data as { status?: string } | null;
    if (!['approved', 'rejected'].includes(result?.status ?? '')) {
      return fail(result?.status === 'forbidden' ? 403 : 400, { error: 'Attendance is no longer pending review' });
    }
    return { success: true };
  },
} satisfies Actions;
