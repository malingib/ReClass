import type { PageServerLoad } from './$types';
import { getAgedInvoices } from '$lib/server/_finance/invoices';

export const load: PageServerLoad = async ({ locals }) => {
  return getAgedInvoices(locals.srv, locals.tenantId);
};
