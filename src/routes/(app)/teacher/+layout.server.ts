import type { LayoutServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { teacherCapabilities } from '$lib/server/_auth/capabilities';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user, tenantId } = requireTenantRole(locals, 'teacher', 'super_admin');

  // Resolve this teacher's access scope from their teacher_type. Admins fall
  // back to full access via hasCapability's role short-circuit.
  let teacherType: string | null = null;
  if (locals.role === 'teacher') {
    const { data: teacher } = await locals.srv
      .from('teachers')
      .select('teacher_type')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .maybeSingle();
    teacherType = teacher?.teacher_type ?? null;
  }

  return {
    capabilities: teacherCapabilities(teacherType),
    teacherType,
  };
};
