import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
  const [{ data: events }, { data: students }] = await Promise.all([
    locals.srv.from('student_lifecycle_events').select('id,student_id,event_type,event_date,notes,created_at').eq('tenant_id', tenantId).order('event_date', { ascending: false }).limit(200),
    locals.srv.from('students').select('id,first_name,last_name,admission_no,grade').eq('tenant_id', tenantId).is('deleted_at', null).order('first_name').limit(500),
  ]); return { events: events ?? [], students: students ?? [] };
};
export const actions = { create: async ({ locals, request }) => {
  const { tenantId, userId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin'); const f = await request.formData();
  const studentId = String(f.get('student_id') ?? ''); const eventType = String(f.get('event_type') ?? '');
  if (!studentId || !eventType) return fail(400, { error: 'Student and event type are required' });
  const { error } = await locals.srv.from('student_lifecycle_events').insert({ tenant_id: tenantId, student_id: studentId, event_type: eventType, event_date: String(f.get('event_date') || new Date().toISOString().slice(0,10)), notes: String(f.get('notes') || '') || null, created_by: userId });
  if (error) return fail(500, { error: error.message }); return { success: true };
} } satisfies Actions;
