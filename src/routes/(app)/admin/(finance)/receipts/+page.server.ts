import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
  const { data: payments } = await locals.srv
    .from('payments')
    .select(`
      id, amount, method, domain, bank_reference, mpesa_receipt, phone, receipt_no, created_at,
      students!inner(first_name, last_name, admission_no, grade),
      fee_types(name)
    `)
    .eq('tenant_id', locals.tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  return {
    payments: (payments ?? []).map((p: any) => ({
      ...p,
      student_name: `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim() || '—',
      admission_no: p.students?.admission_no ?? '—',
      grade: p.students?.grade ?? '—',
      fee_type: p.fee_types?.name ?? '—',
    })),
  };
};
