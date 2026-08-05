import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';
import { getPaymentChannels } from '$lib/server/_platform/payment-channels';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { parent, students: [], feeTypes: [], channels: { school: 'bank', remedial: 'mpesa' }, tenant: null };

  const [studentsRes, feeTypesRes, channels, tenantRes] = await Promise.all([
    locals.srv
      .from('students')
      .select('id, admission_no, first_name, last_name, grade')
      .eq('tenant_id', tenantId)
      .in('id', studentIds)
      .order('first_name'),
    locals.srv
      .from('fee_types')
      .select('id, name, amount, domain, term')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
    getPaymentChannels(locals.srv, tenantId),
    locals.srv
      .from('tenants')
      .select('kcb_account_no, kcb_bank_name, buni_shortcode, mpesa_paybill')
      .eq('id', tenantId)
      .maybeSingle(),
  ]);

  return {
    parent,
    students: studentsRes.data ?? [],
    feeTypes: feeTypesRes.data ?? [],
    channels,
    tenant: tenantRes.data ?? null,
  };
};
