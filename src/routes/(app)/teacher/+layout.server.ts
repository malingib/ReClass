import type { LayoutServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { capabilitiesForTeacher, type RemedialRole } from '$lib/server/_auth/capabilities';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user, tenantId } = requireTenantRole(locals, 'teacher', 'super_admin');

  let teacherType: string | null = null;
  let committeeRole: RemedialRole = 'none';
  if (locals.role === 'teacher') {
    const { data: teacher } = await locals.srv
      .from('teachers')
      .select('teacher_type,remedial_role')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .maybeSingle();
    teacherType = teacher?.teacher_type ?? null;
    committeeRole = (teacher?.remedial_role ?? 'none') as RemedialRole;
  }

  return {
    capabilities: capabilitiesForTeacher(teacherType, committeeRole),
    teacherType,
    committeeRole,
  };
};
