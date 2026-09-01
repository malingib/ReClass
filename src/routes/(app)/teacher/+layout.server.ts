import type { LayoutServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { teacherCapabilities } from '$lib/server/_auth/capabilities';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user, tenantId } = requireTenantRole(locals, 'teacher', 'super_admin');

  // Resolve teaching scope and the optional committee hat once for the entire
  // teacher route tree. The shell uses this only for navigation visibility;
  // every route/action still performs its own server-side authorization.
  let teacherType: string | null = null;
  let remedialRole = 'none';

  if (locals.role === 'teacher') {
    const { data: teacher } = await locals.srv
      .from('teachers')
      .select('teacher_type, remedial_role')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .maybeSingle();

    teacherType = teacher?.teacher_type ?? null;
    remedialRole = teacher?.remedial_role ?? 'none';
  }

  return {
    capabilities: teacherCapabilities(teacherType),
    teacherType,
    remedialRole,
    canAccessCommittee: ['chairman', 'treasurer', 'member'].includes(remedialRole),
  };
};