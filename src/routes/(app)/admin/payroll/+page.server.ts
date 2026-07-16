import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.srv;
  const tid = locals.tenantId;

  const [payrollRes, teachersRes] = await Promise.all([
    sb
      .from('payroll_runs')
      .select(`
        id, teacher_id, period_start, period_end, occurrences_count, rate_per_session, amount, status, paid_at, created_at,
        teachers!inner(first_name, last_name)
      `)
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
      .limit(100),
    sb
      .from('teachers')
      .select('id, first_name, last_name')
      .eq('tenant_id', tid)
      .order('first_name'),
  ]);

  const payroll = (payrollRes.data ?? []).map((r: any) => ({
    ...r,
    teacher_name: r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : 'Unknown',
  }));

  return { payroll, teachers: teachersRes.data ?? [] };
};

export const actions: Actions = {
  generate: async ({ locals, request }) => {
    const sb = locals.srv;
    const tid = locals.tenantId;
    const form = await request.formData();
    const periodStart = form.get('period_start') as string;
    const periodEnd = form.get('period_end') as string;

    if (!periodStart || !periodEnd) {
      return fail(400, { error: 'Period start and end dates are required.' });
    }

    if (new Date(periodEnd) < new Date(periodStart)) {
      return fail(400, { error: 'Period end must be after period start.' });
    }

    // Get all teachers for this tenant
    const { data: teachers } = await sb
      .from('teachers')
      .select('id')
      .eq('tenant_id', tid);

    if (!teachers || teachers.length === 0) {
      return fail(400, { error: 'No teachers found. Add teachers first.' });
    }

    // Get the payroll rate from tenant settings
    const { data: tenant } = await sb
      .from('tenants')
      .select('payroll_rate_per_session')
      .eq('id', tid)
      .single();

    const ratePerSession = Number(tenant?.payroll_rate_per_session ?? 0);
    if (ratePerSession <= 0) {
      return fail(400, { error: 'Payroll rate per session is not set. Configure it in Settings > Academic.' });
    }

    // For each teacher, count their attendance (present/late) in the period
    const payrollRecords = [];
    const errors: string[] = [];

    for (const teacher of teachers) {
      const { data: occurrences, error: countError } = await sb
        .from('teacher_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .eq('teacher_id', teacher.id)
        .in('status', ['present', 'late'])
        .gte('marked_at', `${periodStart}T00:00:00`)
        .lte('marked_at', `${periodEnd}T23:59:59`);

      if (countError) {
        errors.push(`Error counting attendance for teacher ${teacher.id}`);
        continue;
      }

      const count = occurrences?.length ?? 0;

      if (count === 0) continue; // Skip teachers with no attendance

      payrollRecords.push({
        tenant_id: tid,
        teacher_id: teacher.id,
        period_start: periodStart,
        period_end: periodEnd,
        occurrences_count: count,
        rate_per_session: ratePerSession,
        amount: count * ratePerSession,
        status: 'draft',
      });
    }

    if (payrollRecords.length === 0) {
      return fail(400, { error: 'No teacher attendance found in this period. Mark attendance first.' });
    }

    const { error: insertError } = await sb
      .from('payroll_runs')
      .insert(payrollRecords);

    if (insertError) {
      console.error('Payroll generate error:', insertError);
      return fail(500, { error: 'Failed to generate payroll records. Please try again.' });
    }

    return {
      success: true,
      count: payrollRecords.length,
      totalAmount: payrollRecords.reduce((sum, r) => sum + r.amount, 0),
      periodStart,
      periodEnd,
    };
  },

  approve: async ({ locals, request }) => {
    const sb = locals.srv;
    const tid = locals.tenantId;
    const form = await request.formData();
    const id = form.get('id') as string;

    if (!id) {
      return fail(400, { error: 'Payroll run ID is required' });
    }

    const { error } = await sb
      .from('payroll_runs')
      .update({ status: 'approved' })
      .eq('id', id)
      .eq('tenant_id', tid);

    if (error) {
      console.error('Payroll approve error:', error);
      return fail(500, { error: 'Failed to approve payroll run.' });
    }

    return { success: true };
  },
};
