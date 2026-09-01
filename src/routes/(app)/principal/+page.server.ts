import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getPrincipalDashboardOptimized } from '$lib/server/_platform/dashboard-queries';

// Use the optimized dashboard queries instead of individual queries
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'principal');
  
  try {
    // Use the optimized function that batches all queries
    const dashboardData = await getPrincipalDashboardOptimized(locals.srv, tenantId);
    
    return {
      stats: dashboardData.stats,
      sis: dashboardData.sis,
      pendingAttendance: dashboardData.pendingAttendance,
    };
  } catch (error) {
    console.error('Failed to load principal dashboard:', error);
    // Fallback to basic queries if optimized ones fail
    const { getSisStats } = await import('$lib/server/_sis/sis');
    const sis = await getSisStats(locals.srv, tenantId);
    
    return {
      stats: {
        students: 0,
        teachers: 0,
        attendanceRate: 0,
        sessions: 0,
      },
      sis,
      pendingAttendance: [],
    };
  }
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
