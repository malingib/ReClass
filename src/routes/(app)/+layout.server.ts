import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Both lookups depend only on the authoritative request context and can run
  // concurrently. Keeping them parallel removes avoidable TTFB from every app route.
  const brandQuery = locals.tenantId && locals.srv
    ? locals.srv
        .from('tenants')
        .select('name, logo_url, brand_primary')
        .eq('id', locals.tenantId)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const committeeQuery = locals.role === 'teacher' && locals.tenantId && locals.user && locals.srv
    ? locals.srv
        .from('teachers')
        .select('remedial_role')
        .eq('tenant_id', locals.tenantId)
        .eq('profile_id', locals.user.id)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data: brandData }, { data: teacher }] = await Promise.all([brandQuery, committeeQuery]);

  const brand = brandData
    ? { name: brandData.name, logo_url: brandData.logo_url ?? null, brand_primary: brandData.brand_primary ?? null }
    : null;
  const canAccessCommittee = ['chairman', 'treasurer', 'member'].includes(
    (teacher as { remedial_role?: string } | null)?.remedial_role ?? 'none',
  );

  return {
    role: locals.role,
    roles: locals.roles,
    tenantId: locals.tenantId,
    brand,
    canAccessCommittee,
  };
};
