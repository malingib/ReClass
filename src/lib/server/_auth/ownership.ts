import { error } from '@sveltejs/kit';
import { requireTenantRole } from './auth';

export async function studentBelongsToTenant(srv: App.Locals['srv'], studentId: string, tenantId: string) {
  const { data } = await srv.from('students').select('id').eq('id', studentId).eq('tenant_id', tenantId).is('deleted_at', null).maybeSingle();
  return !!data;
}

export async function getParentOwnership(locals: App.Locals) {
  const { user, tenantId } = requireTenantRole(locals, 'parent');
  const { data: parent } = await locals.srv
    .from('parents')
    .select('id, full_name, phone, sms_consent')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!parent) error(403, 'Your account is not linked to a parent profile');

  const { data: links } = await locals.srv
    .from('guardians_link')
    .select('student_id')
    .eq('parent_id', parent.id)
    .eq('tenant_id', tenantId);
  const studentIds = (links ?? []).map((link: { student_id: string }) => link.student_id);

  return { tenantId, parent, studentIds };
}

export async function getTeacherOwnership(locals: App.Locals) {
  const { user, tenantId } = requireTenantRole(locals, 'teacher');
  const { data: teacher } = await locals.srv
    .from('teachers')
    .select('id, first_name, last_name, teacher_type, remedial_role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!teacher) error(403, 'Your account is not linked to a teacher profile');
  return { user, tenantId, teacher };
}
