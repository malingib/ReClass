import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;

  const { data: students } = await db
    .from('students')
    .select('id, first_name, last_name, grade, status')
    .eq('tenant_id', locals.tenantId)
    .limit(5);

  const { data: invoices } = await db
    .from('invoices')
    .select('id, amount_due, amount_paid, status, due_date')
    .eq('tenant_id', locals.tenantId)
    .order('created_at', { ascending: false })
    .limit(5);

  return { students: students ?? [], invoices: invoices ?? [] };
};
