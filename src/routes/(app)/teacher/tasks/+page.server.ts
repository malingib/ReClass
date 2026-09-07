import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getTeacherOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, teacher } = await getTeacherOwnership(locals);
  const { data } = await locals.srv.from('teacher_tasks').select('id,title,description,due_at,priority,status,reminder_minutes,completed_at').eq('tenant_id', tenantId).eq('teacher_id', teacher.id).order('due_at').limit(100);
  return { tasks: data ?? [] };
};

export const actions = {
  complete: async ({ locals, request }) => {
    const { tenantId, teacher } = await getTeacherOwnership(locals); const f = await request.formData(); const id = String(f.get('id') ?? '');
    if (!id) return fail(400, { error: 'Task id is required' });
    const { error } = await locals.srv.from('teacher_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId).eq('teacher_id', teacher.id);
    if (error) return fail(500, { error: error.message }); return { success: true };
  },
} satisfies Actions;
