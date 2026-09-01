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
  let canAccessCommittee = false;
  if (locals.role === 'teacher' && locals.tenantId && locals.user) {
    const { data: teacher } = await locals.srv
      .from('teachers')
      .select('remedial_role')
      .eq('tenant_id', locals.tenantId)
      .eq('profile_id', locals.user.id)
      .maybeSingle();
    canAccessCommittee = ['chairman', 'treasurer', 'member'].includes(teacher?.remedial_role ?? 'none');
  }

  return {
    role: locals.role,
    roles: locals.roles,
    tenantId: locals.tenantId,
    brand,
    canAccessCommittee,
  };
};
