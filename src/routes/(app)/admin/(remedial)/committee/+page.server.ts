import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const assignmentSchema = z.object({ role_id: z.string().min(1), teacher_id: z.string().min(1) });
const operatorSchema = z.object({ role_assignment_id: z.string().min(1), operator_role: z.enum(['initiator', 'approver', 'manager', 'auditor']), approval_level: z.coerce.number().int().min(1).max(5).optional() });
const settingsSchema = z.object({ paybill_number: z.string().max(30).optional(), account_prefix: z.string().max(30).optional(), approval_levels: z.coerce.number().int().min(1).max(5) });
const rightsSchema = z.object({ assignment_id: z.string().min(1), rights: z.string().optional() });
const idSchema = z.object({ id: z.string().min(1) });
const RIGHTS = [['view_committee','View committee'],['manage_members','Manage committee members'],['initiate_payments','Initiate PayBill payments'],['approve_payments','Approve PayBill payments'],['approve_level_1','Approve level 1'],['approve_level_2','Approve level 2'],['approve_level_3','Approve level 3'],['approve_level_4','Approve level 4'],['approve_level_5','Approve level 5'],['view_payments','View payment records'],['reconcile_payments','Reconcile payments'],['manage_paybill','Manage PayBill configuration']] as const;

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal'); const db = locals.srv;
  const [{ data: roles }, { data: assignments }, { data: operators }, { data: settings }, governance, { data: teacherRoles }] = await Promise.all([
    db.from('remedial_committee_role_definitions').select('id,name,description,active').eq('tenant_id', tenantId).eq('active', true).order('name'),
    db.from('remedial_committee_role_assignments').select('id,role_id,teacher_id,active,assigned_at,remedial_committee_role_definitions!inner(name),profiles!inner(full_name,phone)').eq('tenant_id', tenantId).order('assigned_at', { ascending: false }),
    db.from('remedial_paybill_operators').select('id,role_assignment_id,committee_member_id,operator_role,approval_level,active,remedial_committee_role_assignments(profiles(full_name),remedial_committee_role_definitions(name))').eq('tenant_id', tenantId).order('operator_role'),
    db.from('remedial_paybill_settings').select('*').eq('tenant_id', tenantId).maybeSingle(), governance = await db.rpc('remedial_paybill_governance_status', { p_tenant_id: tenantId }),
    db.from('user_roles').select('user_id').eq('tenant_id', tenantId).eq('role', 'teacher'),
  ]);
  const ids = (teacherRoles ?? []).map((r: any) => r.user_id); const { data: teachers } = ids.length ? await db.from('profiles').select('id,full_name,phone').in('id', ids).order('full_name') : { data: [] };
  const assignmentIds = (assignments ?? []).map((r: any) => r.id); const { data: rights } = assignmentIds.length ? await db.from('remedial_committee_rights').select('assignment_id,right_code,granted').in('assignment_id', assignmentIds).eq('granted', true) : { data: [] };
  return { roles: roles ?? [], assignments: assignments ?? [], teachers: teachers ?? [], operators: operators ?? [], rights: rights ?? [], rightCatalog: RIGHTS, settings: settings ?? { approval_levels: 1, minimum_web_operators: 2, maker_checker_required: true }, governance: governance?.data ?? null };
};

export const actions = {
  assignRole: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal'); const v = parseForm(assignmentSchema, await request.formData()); if (!v.success) return fail(400, { message: 'Select an existing committee role and a teacher.' });
    const { error: validationError } = await locals.srv.rpc('validate_reclass_committee_role_assignment', { p_tenant_id: tenantId, p_role_id: v.data.role_id, p_teacher_id: v.data.teacher_id }); if (validationError) return fail(400, { message: validationError.message });
    const { error } = await locals.srv.from('remedial_committee_role_assignments').upsert({ tenant_id: tenantId, role_id: v.data.role_id, teacher_id: v.data.teacher_id, active: true, assigned_by: locals.user?.id ?? null }, { onConflict: 'tenant_id,role_id,teacher_id' }); if (error) return fail(500, { message: error.message });
    return { success: true, message: 'Committee role assigned to teacher.' };
  },
  assignOperator: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal'); const v = parseForm(operatorSchema, await request.formData()); if (!v.success) return fail(400, { message: 'Complete the PayBill operator assignment.' });
    const level = v.data.operator_role === 'approver' ? v.data.approval_level : null;
    const { error: validationError } = await locals.srv.rpc('validate_reclass_paybill_role_operator', { p_tenant_id: tenantId, p_role_assignment_id: v.data.role_assignment_id, p_operator_role: v.data.operator_role, p_approval_level: level }); if (validationError) return fail(400, { message: validationError.message });
    const { data: existing } = await locals.srv.from('remedial_paybill_operators').select('id').eq('tenant_id', tenantId).eq('role_assignment_id', v.data.role_assignment_id).eq('operator_role', v.data.operator_role).eq('approval_level', level).maybeSingle();
    const payload = { tenant_id: tenantId, role_assignment_id: v.data.role_assignment_id, committee_member_id: null, operator_role: v.data.operator_role, approval_level: level, active: true, effective_to: null };
    const result = existing ? await locals.srv.from('remedial_paybill_operators').update(payload).eq('id', existing.id).eq('tenant_id', tenantId) : await locals.srv.from('remedial_paybill_operators').insert(payload);
    if (result.error) return fail(500, { message: result.error.message });
    return { success: true, message: 'PayBill rights assigned to the teacher holding that committee role.' };
  },
  grantRights: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal'); const v = parseForm(rightsSchema, await request.formData()); if (!v.success) return fail(400, { message: 'Select a committee assignment.' });
    const selected = (v.data.rights ?? '').split(',').filter(Boolean).filter((r) => RIGHTS.some(([code]) => code === r));
    const { data: assignment } = await locals.srv.from('remedial_committee_role_assignments').select('id').eq('id', v.data.assignment_id).eq('tenant_id', tenantId).maybeSingle(); if (!assignment) return fail(404, { message: 'Committee assignment not found.' });
    const { error: deleteError } = await locals.srv.from('remedial_committee_rights').delete().eq('assignment_id', v.data.assignment_id).eq('tenant_id', tenantId); if (deleteError) return fail(500, { message: deleteError.message });
    if (selected.length) { const { error } = await locals.srv.from('remedial_committee_rights').insert(selected.map((right_code) => ({ tenant_id: tenantId, assignment_id: v.data.assignment_id, right_code, granted: true, granted_by: locals.user?.id ?? null }))); if (error) return fail(500, { message: error.message }); }
    return { success: true, message: 'Additional rights updated.' };
  },
  saveSettings: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal'); const v = parseForm(settingsSchema, await request.formData()); if (!v.success) return fail(400, { message: 'Approval levels must be between 1 and 5.' });
    const { error } = await locals.srv.from('remedial_paybill_settings').upsert({ tenant_id: tenantId, paybill_number: v.data.paybill_number || null, account_prefix: v.data.account_prefix || null, approval_levels: v.data.approval_levels, minimum_web_operators: 2, maker_checker_required: true, initiator_may_approve_own_transaction: false, updated_by: locals.user?.id ?? null }, { onConflict: 'tenant_id' }); if (error) return fail(500, { message: error.message }); return { success: true, message: 'PayBill governance settings saved.' };
  },
  deactivate: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal'); const v = parseForm(idSchema, await request.formData()); if (!v.success) return fail(400, { message: 'Assignment not found.' });
    await locals.srv.from('remedial_paybill_operators').update({ active: false, effective_to: new Date().toISOString() }).eq('id', v.data.id).eq('tenant_id', tenantId); return { success: true, message: 'Operator assignment deactivated.' };
  },
} satisfies Actions;
