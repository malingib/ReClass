import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';
import { getPayrollRuns } from '$lib/server/_finance/payroll';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  if ((teacher.remedial_role ?? 'none') !== 'treasurer') error(403, 'Only the remedial treasurer can manage compensation.');
  const runs = await getPayrollRuns(locals.srv, tenantId, 'remedial');
  const { data: components } = await locals.srv.from('payroll_components').select('*').eq('tenant_id', tenantId).order('created_at');
  return { runs, components: components ?? [] };
};

export const actions: Actions = {
  add: async ({ locals, request }) => {
    const { tenantId, teacher } = await getTeacherOwnership(locals);
    if ((teacher.remedial_role ?? 'none') !== 'treasurer') return fail(403, { error: 'Only the remedial treasurer can manage compensation.' });
    const fd = await request.formData();
    const quantity = Number(fd.get('quantity') ?? 1);
    const rate = Number(fd.get('rate') ?? 0);
    const amount = Number(fd.get('amount') ?? quantity * rate);
    const { error: err } = await locals.srv.rpc('add_payroll_component', {
      p_payroll_run_id: String(fd.get('payroll_run_id') ?? ''),
      p_component_type: String(fd.get('component_type') ?? ''),
      p_description: String(fd.get('description') ?? ''),
      p_quantity: quantity,
      p_rate: rate,
      p_amount: amount,
      p_role_code: fd.get('role_code')?.toString() || null,
      p_role_label: fd.get('role_label')?.toString() || null,
      p_source_type: fd.get('source_type')?.toString() || null,
      p_source_id: fd.get('source_id')?.toString() || null,
      p_metadata: {},
    });
    if (err) return fail(400, { error: err.message });
    return { success: true, message: 'Compensation line added.' };
  },
};