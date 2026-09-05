import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';
import { admitApplication } from '$lib/server/_sis/lifecycle';

const admissionSchema = z.object({
  id: z.string().optional(),
  application_no: z.string().min(1).max(50),
  applicant_first_name: z.string().min(1).max(100),
  applicant_middle_name: z.string().max(100).optional(),
  applicant_last_name: z.string().min(1).max(100),
  date_of_birth: z.string().optional(),
  gender: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(254).optional(),
  previous_school: z.string().max(200).optional(),
  academic_year_id: z.string().min(1),
  applying_for_year_group_id: z.string().optional(),
  guardian_name: z.string().max(200).optional(),
  guardian_relationship: z.string().max(80).optional(),
  guardian_phone: z.string().max(30).optional(),
  guardian_email: z.string().max(254).optional(),
  notes: z.string().max(2000).optional(),
});
const idSchema = z.object({ id: z.string().min(1) });
const admitSchema = idSchema.extend({ admission_no: z.string().min(1).max(50), student_no: z.string().max(50).optional() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const db = locals.srv as unknown as { from: (table: string) => any };
  const [{ data: admissions }, { data: years }, { data: groups }] = await Promise.all([
    db.from('admissions').select('id, application_no, applicant_first_name, applicant_middle_name, applicant_last_name, phone, academic_year_id, applying_for_year_group_id, status, applied_on, decision_on, admission_no, student_id, notes, academic_years(name), year_groups(name)').eq('tenant_id', tenantId).is('deleted_at', null).order('applied_on', { ascending: false }),
    db.from('academic_years').select('id, name, status').eq('tenant_id', tenantId).is('deleted_at', null).order('starts_on', { ascending: false }),
    db.from('year_groups').select('id, name').eq('tenant_id', tenantId).is('deleted_at', null).eq('active', true).order('sort_order', { ascending: true }),
  ]);
  return { admissions: admissions ?? [], years: years ?? [], groups: groups ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(admissionSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const db = locals.srv as unknown as { from: (table: string) => any };
    const { data: admission, error } = await db.from('admissions').insert({
      tenant_id: tenantId, application_no: v.data.application_no.trim(), applicant_first_name: v.data.applicant_first_name.trim(), applicant_middle_name: v.data.applicant_middle_name?.trim() || null, applicant_last_name: v.data.applicant_last_name.trim(), date_of_birth: v.data.date_of_birth || null, gender: v.data.gender || null, phone: v.data.phone || null, email: v.data.email || null, previous_school: v.data.previous_school || null, academic_year_id: v.data.academic_year_id, applying_for_year_group_id: v.data.applying_for_year_group_id || null, notes: v.data.notes || null, created_by: locals.user?.id || null,
    }).select('id').single();
    if (error) return fail(error.code === '23505' ? 409 : 500, { message: error.code === '23505' ? 'Application number already exists.' : error.message });
    if (v.data.guardian_name?.trim()) {
      await db.from('admission_guardians').insert({ tenant_id: tenantId, admission_id: admission.id, full_name: v.data.guardian_name.trim(), relationship: v.data.guardian_relationship || null, phone: v.data.guardian_phone || null, email: v.data.guardian_email || null, is_primary: true });
    }
    return { success: true, message: 'Admission application created.' };
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
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const db = locals.srv as unknown as { from: (table: string) => any };
    const { error } = await db.from('admissions').update({ status: 'rejected', decision_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('id', v.data.id).eq('tenant_id', tenantId).eq('status', 'pending');
    if (error) return fail(500, { message: error.message });
    return { success: true, message: 'Application rejected.' };
  },
  withdraw: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const db = locals.srv as unknown as { from: (table: string) => any };
    const { error } = await db.from('admissions').update({ status: 'withdrawn', decision_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('id', v.data.id).eq('tenant_id', tenantId).eq('status', 'pending');
    if (error) return fail(500, { message: error.message });
    return { success: true, message: 'Application withdrawn.' };
  },
} satisfies Actions;
