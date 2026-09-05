import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';
import { admitApplication } from '$lib/server/_sis/lifecycle';

const admissionSchema = z.object({ application_no: z.string().min(1).max(50), applicant_first_name: z.string().min(1).max(100), applicant_middle_name: z.string().max(100).optional(), applicant_last_name: z.string().min(1).max(100), date_of_birth: z.string().optional(), gender: z.string().max(30).optional(), phone: z.string().max(30).optional(), email: z.string().max(254).optional(), previous_school: z.string().max(200).optional(), academic_year: z.string().min(1).max(20), class_id: z.string().optional(), guardian_name: z.string().max(200).optional(), guardian_relationship: z.string().max(80).optional(), guardian_phone: z.string().max(30).optional(), guardian_email: z.string().max(254).optional(), notes: z.string().max(2000).optional() });
const idSchema = z.object({ id: z.string().min(1) });
const admitSchema = idSchema.extend({ admission_no: z.string().min(1).max(50), student_no: z.string().max(50).optional() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const db = locals.srv as unknown as { from: (table: string) => any };
  const [{ data: admissions }, { data: classes }] = await Promise.all([
    db.from('sis_admissions').select('id,application_no,applicant_first_name,applicant_middle_name,applicant_last_name,phone,academic_year,grade_applied,status,admission_number,student_id,admission_date,previous_school,notes').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    db.from('sis_classes').select('id,name,stream,code,academic_year').eq('tenant_id', tenantId).eq('status', 'active').order('name')
  ]);
  const years = [...new Set((classes ?? []).map((c: { academic_year?: string | null }) => c.academic_year).filter(Boolean))];
  return { admissions: admissions ?? [], classes: classes ?? [], years };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(admissionSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const db = locals.srv as unknown as { from: (table: string) => any };
    const { data: admission, error } = await db.from('sis_admissions').insert({ tenant_id: tenantId, application_no: v.data.application_no.trim(), admission_number: v.data.application_no.trim(), applicant_first_name: v.data.applicant_first_name.trim(), applicant_middle_name: v.data.applicant_middle_name?.trim() || null, applicant_last_name: v.data.applicant_last_name.trim(), date_of_birth: v.data.date_of_birth || null, gender: v.data.gender || null, phone: v.data.phone || null, email: v.data.email || null, grade_applied: v.data.class_id || null, academic_year: v.data.academic_year, previous_school: v.data.previous_school || null, guardian_name: v.data.guardian_name || null, guardian_relationship: v.data.guardian_relationship || null, guardian_phone: v.data.guardian_phone || null, guardian_email: v.data.guardian_email || null, notes: v.data.notes || null, created_by: locals.user?.id || null }).select('id').single();
    if (error) return fail(error.code === '23505' ? 409 : 500, { message: error.code === '23505' ? 'Application number already exists.' : error.message });
    return { success: true, message: `Application ${admission.id} created.` };
  },
  admit: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(admitSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const result = await admitApplication(locals.srv, { tenantId, admissionId: v.data.id, actorId: locals.user?.id ?? '', admissionNo: v.data.admission_no.trim(), studentNo: v.data.student_no?.trim() || null });
    if (!result.ok) return fail(400, { message: result.error.message ?? 'Could not admit applicant.' });
    return { success: true, message: 'Applicant admitted and student record created.' };
  },
  reject: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin'); const v = parseForm(idSchema, await request.formData()); if (!v.success) return fail(400, { errors: v.errors });
    const db = locals.srv as unknown as { from: (table: string) => any }; const { error } = await db.from('sis_admissions').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', v.data.id).eq('tenant_id', tenantId).eq('status', 'pending'); if (error) return fail(500, { message: error.message }); return { success: true, message: 'Application rejected.' };
  },
} satisfies Actions;
