import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getUnmatchedPayments, matchUnmatchedPayment } from '$lib/server/_finance/payments';

// Unmatched manual deposits queue — admin/bursar matches them to a student.
export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const [unmatched, studentsRes, feeTypesRes] = await Promise.all([
    getUnmatchedPayments(locals.srv, locals.tenantId),
    locals.srv.from('students')
      .select('id, admission_no, first_name, last_name')
      .eq('tenant_id', locals.tenantId)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('first_name'),
    locals.srv.from('fee_types')
      .select('id, name, amount, domain')
      .eq('tenant_id', locals.tenantId)
      .is('deleted_at', null)
      .order('name'),
  ]);

  return { unmatched: unmatched ?? [], students: studentsRes.data ?? [], feeTypes: feeTypesRes.data ?? [] };
};

export const actions: Actions = {
  match: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();
    return matchUnmatchedPayment(
      locals.srv,
      tenantId,
      user?.id,
      String(fd.get('unmatched_id') ?? ''),
      String(fd.get('student_id') ?? ''),
      String(fd.get('fee_type_id') ?? '') || null,
    );
  },
};
