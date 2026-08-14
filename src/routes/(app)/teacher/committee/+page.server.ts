import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';
import { getAttendanceCounts } from '$lib/server/_remedial/attendance';
import { getPayrollRuns, generateRemedialPayroll, approvePayrollRun, payPayrollRunB2C } from '$lib/server/_finance/payroll';

// Remedial committee portal — for teachers wearing the chairman/treasurer hats.
// Attendance approval (committee) and payroll (treasurer prepares, chairman
// approves, treasurer initiates the B2C payout).
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  const committeeRole = teacher.remedial_role ?? 'none';
  if (committeeRole !== 'chairman' && committeeRole !== 'treasurer' && committeeRole !== 'member') {
    error(403, 'You do not hold a remedial committee role.');
  }

  const [attendance, payroll, pending] = await Promise.all([
    getAttendanceCounts(locals.srv, tenantId),
    getPayrollRuns(locals.srv, tenantId, 'remedial'),
    locals.srv
      .from('teacher_attendance')
      .select('id, status, marked_at, teachers(first_name, last_name), session_occurrences(occurs_on, start_time, end_time, class, sessions(subjects(name)))')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .is('deleted_at', null)
      .order('marked_at')
      .limit(100),
  ]);

  const rows = payroll;
  return {
    committeeRole,
    teacher,
    pendingAttendance: pending.data ?? [],
    attendanceStats: attendance,
    payoutStats: {
      totalRuns: rows.length,
      paidRuns: rows.filter(r => r.status === 'paid').length,
      processingRuns: rows.filter(r => r.status === 'processing').length,
      pendingRuns: rows.filter(r => r.status === 'approved' || r.status === 'draft' || r.status === 'pending').length,
      failedRuns: rows.filter(r => r.status === 'failed').length,
      totalDue: rows.reduce((s, r) => s + Number(r.amount ?? 0), 0),
      totalPaid: rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount ?? 0), 0),
    },
    runs: rows,
  };
};

export const actions: Actions = {
  review: async ({ locals, request }) => {
    const { user, tenantId, teacher } = await getTeacherOwnership(locals);
    const committeeRole = teacher.remedial_role ?? 'none';
    if (committeeRole !== 'chairman' && committeeRole !== 'member') {
      return fail(403, { error: 'Only the committee chairman (or a member) can review attendance.' });
    }
    const fd = await request.formData();
    const attendanceId = fd.get('attendance_id')?.toString();
    const decision = fd.get('decision')?.toString();
    const note = fd.get('note')?.toString().trim() || undefined;
    if (!attendanceId || !decision || !['approved', 'rejected'].includes(decision)) {
      return fail(400, { error: 'Attendance and a valid review decision are required' });
    }
    if (decision === 'rejected' && !note) return fail(400, { error: 'A rejection reason is required' });

    const { data, error: err } = await locals.srv.rpc('review_teacher_attendance', {
      p_tenant_id: tenantId,
      p_profile_id: user.id,
      p_attendance_id: attendanceId,
      p_decision: decision,
      p_note: note,
    });
    if (err) return fail(500, { error: 'Unable to review attendance' });
    const result = data as { status?: string } | null;
    if (!['approved', 'rejected'].includes(result?.status ?? '')) {
      return fail(result?.status === 'forbidden' ? 403 : 400, { error: 'Attendance is no longer pending review' });
    }
    return { success: true, message: `Attendance ${result?.status ?? 'updated'}.` };
  },

  generate: async ({ locals, request }) => {
    const { tenantId, teacher } = await getTeacherOwnership(locals);
    if ((teacher.remedial_role ?? 'none') !== 'treasurer') {
      return fail(403, { error: 'Only the remedial treasurer can generate payroll.' });
    }
    const fd = await request.formData();
    const res = await generateRemedialPayroll(
      locals.srv,
      tenantId,
      String(fd.get('period_start') ?? ''),
      String(fd.get('period_end') ?? ''),
    );
    if (!('success' in res)) return res;
    return { success: true as const, message: `Payroll generated (KES ${res.totalAmount.toLocaleString()}).` };
  },

  approve: async ({ locals, request }) => {
    const { tenantId, teacher } = await getTeacherOwnership(locals);
    if ((teacher.remedial_role ?? 'none') !== 'chairman') {
      return fail(403, { error: 'Only the committee chairman can approve payroll.' });
    }
    const fd = await request.formData();
    const res = await approvePayrollRun(locals.srv, tenantId, String(fd.get('id') ?? ''));
    if (!('success' in res)) return res;
    return { success: true as const, message: 'Payroll run approved.' };
  },

  pay: async ({ locals, request }) => {
    const { user, tenantId, teacher } = await getTeacherOwnership(locals);
    if ((teacher.remedial_role ?? 'none') !== 'treasurer') {
      return fail(403, { error: 'Only the remedial treasurer can initiate a payout.' });
    }
    const fd = await request.formData();
    return payPayrollRunB2C(locals.srv, tenantId, String(fd.get('id') ?? ''), user.id);
  },
};