import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const assignmentSchema = z.object({ role_id: z.string().uuid(), profile_id: z.string().uuid(), effective_from: z.string().optional(), effective_to: z.string().optional(), notes: z.string().max(500).optional() });
const operatorSchema = z.object({ role_assignment_id: z.string().uuid(), operator_role: z.enum(['initiator', 'approver', 'manager', 'auditor']), approval_level: z.coerce.number().int().min(1).max(5).optional() });
const settingsSchema = z.object({ id: z.string().uuid(), paybill_number: z.string().max(30).optional(), account_prefix: z.string().max(30).optional(), approval_levels: z.coerce.number().int().min(1).max(5) });
const rightSchema = z.object({ assignment_id: z.string().uuid(), right_key: z.string().min(1), granted: z.coerce.boolean() });
const endSchema = z.object({ id: z.string().uuid(), effective_to: z.string().optional() });
const idSchema = z.object({ id: z.string().uuid() });
const RIGHTS = [['view_committee','View committee'],['manage_members','Manage committee members'],['initiate_payments','Initiate PayBill payments'],['approve_payments','Approve PayBill payments'],['view_payments','View payment records'],['reconcile_payments','Reconcile payments'],['manage_paybill','Manage PayBill configuration']] as const;

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
  const db = locals.srv;
  const [{ data: roles }, { data: assignments }, { data: operators }, { data: settings }, { data: teacherRoles }] = await Promise.all([
    db.from('reclass_committee_roles').select('id,name,description,active').eq('active', true).order('name'),
    db.from('reclass_committee_assignments').select('id,profile_id,role_id,active,effective_from,effective_to,assigned_at,notes,reclass_committee_roles!inner(name,description)').order('assigned_at', { ascending: false }),
    db.from('remedial_paybill_operators').select('id,role_assignment_id,operator_role,approval_level,active,effective_from,effective_to').eq('tenant_id', tenantId),
    db.from('remedial_paybill_settings').select('*').maybeSingle(),
    db.from('user_roles').select('user_id').eq('tenant_id', tenantId).eq('role', 'teacher')
  ]);
  const profileIds = [...new Set([...(teacherRoles ?? []).map((r: any) => r.user_id), ...(assignments ?? []).map((a: any) => a.profile_id)])];
  const { data: profiles } = profileIds.length ? await db.from('profiles').select('id,full_name,phone').in('id', profileIds).order('full_name') : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const enrichedAssignments = (assignments ?? []).map((a: any) => ({ ...a, profile: profileMap.get(a.profile_id) ?? null, role: a.reclass_committee_roles }));
  const roleAssignmentIds = enrichedAssignments.map((a: any) => a.id);
  const rightsRes = roleAssignmentIds.length ? await db.from('reclass_committee_rights').select('assignment_id,right_key,active').in('assignment_id', roleAssignmentIds).eq('active', true) : { data: [] };
  const enrichedOperators = (operators ?? []).map((o: any) => { const a = enrichedAssignments.find((x: any) => x.id === o.role_assignment_id); return { ...o, profile: a?.profile ?? null, role: a?.role ?? null }; });
  const governance = await db.rpc('remedial_paybill_governance_status', { p_tenant_id: tenantId });
  return { roles: roles ?? [], assignments: enrichedAssignments, teachers: profiles ?? [], operators: enrichedOperators, rights: rightsRes.data ?? [], rightCatalog: RIGHTS, settings: settings ?? { approval_levels: 1, minimum_web_operators: 2, maker_checker_required: true, initiator_may_approve_own_transaction: false }, governance: governance.data ?? null };
};

export const actions = {
  assignRole: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(assignmentSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Select a teacher and committee role.' });
    const { data, error } = await locals.srv.rpc('appoint_reclass_committee_member', { p_profile_id: v.data.profile_id, p_role_id: v.data.role_id, p_effective_from: v.data.effective_from || undefined, p_effective_to: v.data.effective_to || null, p_notes: v.data.notes || null });
    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Committee role assigned.', id: data };
  },
  endAssignment: async ({ locals, request }) => {
    requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(endSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Invalid committee assignment.' });
    const { error } = await locals.srv.rpc('end_reclass_committee_assignment', { p_assignment_id: v.data.id, p_effective_to: v.data.effective_to || undefined });
    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Committee assignment ended.' };
  },
  grantRight: async ({ locals, request }) => {
    requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(rightSchema, await request.formData());
    if (!v.success || !RIGHTS.some(([key]) => key === v.data.right_key)) return fail(400, { message: 'Invalid committee right.' });
    const { error } = await locals.srv.rpc('manage_reclass_committee_right', { p_assignment_id: v.data.assignment_id, p_right_key: v.data.right_key, p_granted: v.data.granted });
    if (error) return fail(400, { message: error.message });
    return { success: true, message: v.data.granted ? 'Right granted.' : 'Right revoked.' };
  },
  assignOperator: async ({ locals, request }) => {
    requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(operatorSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Complete the PayBill operator assignment.' });
    const level = v.data.operator_role === 'approver' ? v.data.approval_level : 1;
    const { error } = await locals.srv.rpc('manage_reclass_paybill_operator', { p_operator_id: null, p_committee_member_id: null, p_role_assignment_id: v.data.role_assignment_id, p_operator_role: v.data.operator_role, p_approval_level: level, p_active: true, p_effective_from: new Date().toISOString(), p_effective_to: null });
    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'PayBill operator assignment saved.' };
  },
  deactivateOperator: async ({ locals, request }) => {
    requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Operator not found.' });
    const { data: operator } = await locals.srv.from('remedial_paybill_operators').select('role_assignment_id,committee_member_id,operator_role,approval_level,effective_from').eq('tenant_id', (requireTenantRole(locals, 'school_admin', 'super_admin', 'principal')).tenantId).eq('id', v.data.id).maybeSingle();
    if (!operator) return fail(404, { message: 'Operator not found.' });
    const { error } = await locals.srv.rpc('manage_reclass_paybill_operator', { p_operator_id: v.data.id, p_committee_member_id: operator.committee_member_id, p_role_assignment_id: operator.role_assignment_id, p_operator_role: operator.operator_role, p_approval_level: operator.approval_level ?? 1, p_active: false, p_effective_from: operator.effective_from, p_effective_to: new Date().toISOString() });
    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'PayBill operator deactivated.' };
  },
  saveSettings: async ({ locals, request }) => {
    requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(settingsSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Approval levels must be between 1 and 5.' });
    const { error } = await locals.srv.rpc('update_reclass_paybill_settings', { p_id: v.data.id, p_paybill_number: v.data.paybill_number || null, p_account_prefix: v.data.account_prefix || null, p_minimum_web_operators: 2, p_approval_levels: v.data.approval_levels, p_maker_checker_required: true, p_initiator_may_approve_own_transaction: false });
    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'PayBill governance settings saved.' };
  }
} satisfies Actions;
