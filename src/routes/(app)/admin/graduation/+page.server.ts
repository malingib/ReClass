import { fail } from '@sveltejs/kit';
import { z } from 'zod/v3';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const schema = z.object({ student_id: z.string().uuid(), enrollment_id: z.string().uuid().optional(), academic_year: z.string().min(4).max(20), graduation_date: z.string().min(10).max(10).optional(), completion_status: z.enum(['pending','complete','incomplete','deferred']), clearance_status: z.enum(['pending','in_progress','cleared','waived']), certificate_reference: z.string().max(100).optional(), notes: z.string().max(1000).optional() });
export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [students, enrollments, graduations] = await Promise.all([
    locals.srv.from('students').select('id, first_name, last_name, admission_no').eq('tenant_id', tenantId).is('deleted_at', null).order('last_name'),
    locals.srv.from('sis_enrollments').select('id, student_id, class_id, academic_year, status, sis_classes(name, stream, code), students(first_name,last_name,admission_no)').eq('tenant_id', tenantId).in('status', ['active','completed']).order('academic_year', { ascending: false }).limit(200),
    locals.srv.from('graduation_records').select('id, student_id, academic_year, graduation_date, completion_status, clearance_status, certificate_reference, students(first_name,last_name,admission_no)').eq('tenant_id', tenantId).order('academic_year', { ascending: false }).limit(100)
  ]);
  if (students.error) throw new Error(students.error.message); if (enrollments.error) throw new Error(enrollments.error.message); if (graduations.error) throw new Error(graduations.error.message);
  return { students: students.data ?? [], enrollments: enrollments.data ?? [], graduations: graduations.data ?? [] };
};
export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin'); const value = parseForm(schema, await request.formData());
    if (!value.success) return fail(400, { errors: value.errors });
    const { error } = await locals.srv.from('graduation_records').upsert({ tenant_id: tenantId, student_id: value.data.student_id, enrollment_id: value.data.enrollment_id || null, academic_year: value.data.academic_year, graduation_date: value.data.graduation_date || null, completion_status: value.data.completion_status, clearance_status: value.data.clearance_status, certificate_reference: value.data.certificate_reference || null, notes: value.data.notes || null }, { onConflict: 'tenant_id,student_id,academic_year' });
    if (error) return fail(500, { message: error.message }); return { success: true };
  },
  graduate: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin'); const v = parseForm(z.object({ student_id: z.string().uuid(), enrollment_id: z.string().uuid().optional(), event_date: z.string().min(10).max(10) }), await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    if (v.data.enrollment_id) { const r = await locals.srv.from('sis_enrollments').update({ status: 'graduated', exited_at: v.data.event_date }).eq('id', v.data.enrollment_id).eq('tenant_id', tenantId); if (r.error) return fail(500, { message: r.error.message }); }
    const lifecycle = await locals.srv.from('student_lifecycle_events').insert({ tenant_id: tenantId, student_id: v.data.student_id, event_type: 'graduated', event_date: v.data.event_date });
    if (lifecycle.error) return fail(500, { message: lifecycle.error.message });
    const exit = await locals.srv.from('student_exit_records').insert({ tenant_id: tenantId, student_id: v.data.student_id, enrollment_id: v.data.enrollment_id || null, exit_type: 'graduated', exit_date: v.data.event_date, clearance_status: 'cleared' });
    if (exit.error) return fail(500, { message: exit.error.message }); return { success: true };
  }
} satisfies Actions;
