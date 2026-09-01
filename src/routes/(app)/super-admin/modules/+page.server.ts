import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Platform view of the module registry. Single-tenant deploy: every
  // `available` module is active; provisioning table is informational.
  let tenantModules: { module_id: string; enabled: boolean }[] = [];
  try {
    const { data } = await locals.adminSrv
      .from('tenant_modules')
      .select('module_id, enabled')
      .eq('tenant_id', locals.tenantId);
    tenantModules = (data ?? []) as any;
  } catch {
    // tenant_modules may not exist on older DBs — fall back to suiteModules.
  }
  return { tenantModules };
};
