import type { PageServerLoad } from './$types';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';
import { hasCapability } from '$lib/server/_auth/capabilities';
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  if (!hasCapability(locals.role, teacher.teacher_type, 'sis:view')) return { lessons: [], reminders: [] };
  const now = new Date(); const through = new Date(now.getTime() + 14 * 864e5).toISOString();
  const [{ data: lessons }, { data: reminders }] = await Promise.all([
    locals.srv.from('lessons').select('id,starts_at,ends_at,room,status,notes,subjects(name),sis_classes(name,stream,code)').eq('tenant_id', tenantId).eq('teacher_id', teacher.id).is('deleted_at', null).gte('starts_at', now.toISOString()).lte('starts_at', through).order('starts_at').limit(100),
    locals.srv.from('teacher_reminders').select('id,title,body,reminder_type,remind_at,status').eq('tenant_id', tenantId).eq('teacher_id', teacher.id).in('status', ['scheduled','sent']).order('remind_at').limit(100),
  ]);
  return { lessons: lessons ?? [], reminders: reminders ?? [] };
};
