import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAttendanceByTenant } from '$lib/server/_remedial/attendance';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { PAGE_LIST_LARGE } from '$lib/config';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));

  const result = await getAttendanceByTenant(locals.srv, tenantId, { page, pageSize: PAGE_LIST_LARGE });

  return {
    attendance: result.data.map((row: { teachers?: { first_name?: string; last_name?: string } | null; marked_at?: string | null; [k: string]: unknown }) => ({
      ...row,
      teacher_name: row.teachers ? `${row.teachers.first_name} ${row.teachers.last_name}` : 'Unknown',
      date: row.marked_at,
    })),
    pagination: { page, pageSize: PAGE_LIST_LARGE, total: result.total },
  };
};

export const actions = {
  review: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const form = await request.formData();
    const attendanceId = form.get('attendance_id')?.toString();
    const decision = form.get('decision')?.toString();
    const note = form.get('note')?.toString() ?? null;

    if (!attendanceId || !decision || !['approved', 'rejected'].includes(decision)) {
      return fail(400, { error: 'Attendance record and review decision are required' });
    }
    if (decision === 'rejected' && !note?.trim()) {
      return fail(400, { error: 'A note is required when rejecting attendance' });
    }

    const { data, error } = await locals.srv.rpc('review_teacher_attendance', {
      p_tenant_id: tenantId,
      p_profile_id: user.id,
      p_attendance_id: attendanceId,
      p_decision: decision,
      p_note: note,
    });
    if (error) return fail(500, { error: 'Unable to review teacher attendance' });

    const result = data as { status?: string } | null;
    if (result?.status !== decision) {
      const status = result?.status;
      const code = status === 'forbidden' || status === 'maker_cannot_approve' ? 403 : 400;
      return fail(code, { error: status === 'maker_cannot_approve' ? 'The person who marked attendance cannot approve it' : 'This attendance record cannot be reviewed' });
    }

    return { success: true, status: decision };
  },
} satisfies Actions;
