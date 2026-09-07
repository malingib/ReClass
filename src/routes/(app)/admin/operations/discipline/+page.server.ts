import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
  const [{ data: cases }, { data: students }] = await Promise.all([
    locals.srv.from('discipline_cases').select('id,student_id,incident_date,category,severity,description,action_taken,status,follow_up_date').eq('tenant_id', tenantId).order('incident_date', { ascending: false }).limit(100),
    locals.srv.from('students').select('id,first_name,last_name,admission_no,grade').eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'active').order('first_name').limit(500),
  ]);
  return { cases: cases ?? [], students: students ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId, userId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
    const f = await request.formData();
    const studentId = String(f.get('student_id') ?? '');
    const description = String(f.get('description') ?? '').trim();
    if (!studentId || !description) return fail(400, { error: 'Student and incident description are required' });
    const { error } = await locals.srv.from('discipline_cases').insert({
      tenant_id: tenantId, student_id: studentId, incident_date: String(f.get('incident_date') || new Date().toISOString().slice(0, 10)),
      category: String(f.get('category') || 'conduct'), severity: String(f.get('severity') || 'minor'), description,
      action_taken: String(f.get('action_taken') || '') || null, follow_up_date: String(f.get('follow_up_date') || '') || null, created_by: userId,
    });
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
  resolve: async ({ locals, request }) => {
    const { tenantId, userId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
    const f = await request.formData(); const id = String(f.get('id') ?? '');
    if (!id) return fail(400, { error: 'Case id is required' });
    const { error } = await locals.srv.from('discipline_cases').update({ status: 'resolved', resolved_by: userId, resolved_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
} satisfies Actions;
