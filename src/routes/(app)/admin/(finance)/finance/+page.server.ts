import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { recordBankPayment } from '$lib/server/_finance/bank-payments';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');

  const yearStart = new Date(Date.now() - 365 * 864e5).toISOString();

  const [{ data: payments }, { data: feeTypes }] = await Promise.all([
    locals.srv.from('payments')
      .select('amount, domain')
      .eq('tenant_id', tenantId).eq('status', 'paid').gte('created_at', yearStart),
    locals.srv.from('fee_types')
      .select('id, name, amount, domain').eq('tenant_id', tenantId).eq('domain', 'school').order('name'),
  ]);

  const rows = payments ?? [];
  const schoolCollected = rows.filter((p) => p.domain === 'school').reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const mpesaCollected = rows.filter((p) => p.domain === 'remedial').reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return {
    stats: {
      schoolCollected,
      mpesaCollected,
      totalTransactions: rows.length,
    },
    feeTypes: feeTypes ?? [],
  };
};

export const actions: Actions = {
  'record-bank': async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
    const form = await request.formData();
    return recordBankPayment(locals.srv, tenantId, user?.id, form);
  },
};
