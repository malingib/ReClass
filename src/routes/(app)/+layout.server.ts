import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // role/tenantId are resolved authoritatively in hooks.server.ts from the
  // JWT + user_roles. Source them from locals rather than re-deriving from URL.
  let brand: { name: string; logo_url: string | null; brand_primary: string | null } | null = null;
  if (locals.tenantId && locals.srv) {
    const { data } = await locals.srv
      .from('tenants')
      .select('name, logo_url, brand_primary')
      .eq('id', locals.tenantId)
      .maybeSingle();
    if (data) brand = { name: data.name, logo_url: data.logo_url ?? null, brand_primary: data.brand_primary ?? null };
  }
  return {
    role: locals.role,
    roles: locals.roles,
    tenantId: locals.tenantId,
    brand,
  };
};
