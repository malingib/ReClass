import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { parent, payments: [] };

  const { data: payments } = await locals.srv
    .from('payments')
    .select(`
      id, amount, method, domain, bank_reference, mpesa_receipt, phone, status, receipt_no, created_at,
      students!inner(first_name, last_name, admission_no),
      fee_types(name)
    `)
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  return {
    parent,
    payments: (payments ?? []).map((p) => ({
      ...p,
      student_name: `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim() || 'Unknown',
      admission_no: p.students?.admission_no ?? '—',
      fee_type: (p.fee_types as { name?: string } | null)?.name ?? '—',
    })),
  };
};
