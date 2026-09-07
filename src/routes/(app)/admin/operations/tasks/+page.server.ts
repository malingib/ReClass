import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
  const [{ data: teachers }, { data: tasks }] = await Promise.all([
    locals.srv.from('teachers').select('id,first_name,last_name,teacher_type').eq('tenant_id', tenantId).is('deleted_at', null).order('first_name').limit(500),
    locals.srv.from('teacher_tasks').select('id,teacher_id,title,due_at,priority,status,reminder_minutes').eq('tenant_id', tenantId).order('due_at').limit(200),
  ]);
  return { teachers: teachers ?? [], tasks: tasks ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId, userId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin'); const f = await request.formData();
    const teacherId = String(f.get('teacher_id') ?? ''); const title = String(f.get('title') ?? '').trim(); const dueAt = String(f.get('due_at') ?? '');
    if (!teacherId || !title || !dueAt) return fail(400, { error: 'Teacher, title and due time are required' });
    const { error } = await locals.srv.from('teacher_tasks').insert({ tenant_id: tenantId, teacher_id: teacherId, title, description: String(f.get('description') || '') || null, due_at: new Date(dueAt).toISOString(), priority: String(f.get('priority') || 'normal'), reminder_minutes: Number(f.get('reminder_minutes') || 60), created_by: userId });
    if (error) return fail(500, { error: error.message }); return { success: true };
  },
} satisfies Actions;
