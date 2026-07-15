import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: tenants } = await locals.supabase
    .from('tenants')
    .select('id, name, domain, status, created_at')
    .order('name');

  return { tenants: tenants ?? [] };
};
