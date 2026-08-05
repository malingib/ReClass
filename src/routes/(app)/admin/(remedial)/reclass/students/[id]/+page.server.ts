import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getStudentTransactions, editPayment } from '$lib/server/_finance/payments';

// Per-student transactions (receipts) for a domain.
export const load: PageServerLoad = async ({ locals, params, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
  const domain = url.searchParams.get('domain') === 'school' ? 'school' : 'remedial';

  const [studentRes, transactions, studentsRes, feeTypesRes] = await Promise.all([
    locals.srv.from('students')
      .select('id, admission_no, first_name, last_name, grade')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    getStudentTransactions(locals.srv, tenantId, params.id, domain),
    locals.srv.from('students')
      .select('id, admission_no, first_name, last_name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('first_name'),
    locals.srv.from('fee_types')
      .select('id, name, amount, domain')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
  ]);

  return {
    student: studentRes.data ?? null,
    domain,
    transactions,
    students: studentsRes.data ?? [],
    feeTypes: feeTypesRes.data ?? [],
  };
};

export const actions: Actions = {
  // Manual receipt edit — audit-logged (before/after) via editPayment.
  edit: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const fd = await request.formData();

    const paymentId = String(fd.get('payment_id') ?? '');
    if (!paymentId) return { error: 'Missing payment.' };

    const amount = parseFloat(String(fd.get('amount') ?? ''));
    if (!Number.isFinite(amount) || amount < 0) return { error: 'Amount must be a positive number.' };

    return editPayment(locals.srv, tenantId, user?.id, paymentId, {
      student_id: String(fd.get('student_id') ?? '') || null,
      fee_type_id: String(fd.get('fee_type_id') ?? '') || null,
      amount,
      method: String(fd.get('method') ?? ''),
      status: String(fd.get('status') ?? ''),
    });
  },
};
