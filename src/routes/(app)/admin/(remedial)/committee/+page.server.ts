import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const memberSchema = z.object({
  user_id: z.string().min(1),
  committee_role: z.enum(['member', 'initiator', 'approver', 'auditor']),
});
const operatorSchema = z.object({
  committee_member_id: z.string().min(1),
  operator_role: z.enum(['initiator', 'approver', 'manager', 'auditor']),
  approval_level: z.coerce.number().int().min(1).max(5).optional(),
});
const settingsSchema = z.object({
  paybill_number: z.string().max(30).optional(),
  account_prefix: z.string().max(30).optional(),
  approval_levels: z.coerce.number().int().min(1).max(5),
});
const idSchema = z.object({ id: z.string().min(1) });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
  const db = locals.srv;
  const [{ data: members }, { data: profiles }, { data: operators }, { data: settings }, governance] = await Promise.all([
    db.from('remedial_committee_members').select('id,user_id,committee_role,active,appointed_at,profiles!inner(full_name,phone)').eq('tenant_id', tenantId).order('committee_role'),
    db.from('profiles').select('id,full_name,phone').eq('tenant_id', tenantId).order('full_name'),
    db.from('remedial_paybill_operators').select('id,committee_member_id,operator_role,approval_level,active,remedial_committee_members!inner(user_id,profiles!inner(full_name))').eq('tenant_id', tenantId).order('operator_role'),
    db.from('remedial_paybill_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
    db.rpc('remedial_paybill_governance_status', { p_tenant_id: tenantId }),
  ]);
  return { members: members ?? [], profiles: profiles ?? [], operators: operators ?? [], settings: settings ?? { approval_levels: 1, minimum_web_operators: 2, maker_checker_required: true }, governance: governance?.data ?? null };
};

export const actions = {
  addMember: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(memberSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Select a valid committee member and role.' });
    const { data: profile } = await locals.srv.from('profiles').select('id').eq('id', v.data.user_id).eq('tenant_id', tenantId).maybeSingle();
    if (!profile) return fail(404, { message: 'User does not belong to this school.' });
    const { error } = await locals.srv.from('remedial_committee_members').upsert({ tenant_id: tenantId, user_id: v.data.user_id, committee_role: v.data.committee_role, active: true }, { onConflict: 'tenant_id,user_id,committee_role' });
    if (error) return fail(500, { message: error.message });
    return { success: true, message: 'Committee assignment saved.' };
  },
  assignOperator: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(operatorSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Complete the PayBill operator assignment.' });
    const level = v.data.operator_role === 'approver' ? v.data.approval_level : null;
    try {
      const { error: validationError } = await locals.srv.rpc('validate_remedial_paybill_operator', { p_tenant_id: tenantId, p_committee_member_id: v.data.committee_member_id, p_operator_role: v.data.operator_role, p_approval_level: level });
      if (validationError) return fail(400, { message: validationError.message });
      const { error } = await locals.srv.from('remedial_paybill_operators').upsert({ tenant_id: tenantId, committee_member_id: v.data.committee_member_id, operator_role: v.data.operator_role, approval_level: level, active: true }, { onConflict: 'tenant_id,committee_member_id,operator_role,approval_level' });
      if (error) return fail(500, { message: error.message });
    } catch (e) { return fail(500, { message: e instanceof Error ? e.message : 'Assignment failed.' }); }
    return { success: true, message: 'PayBill operator assignment saved.' };
  },
  saveSettings: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(settingsSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Approval levels must be between 1 and 5.' });
    const { error } = await locals.srv.from('remedial_paybill_settings').upsert({ tenant_id: tenantId, paybill_number: v.data.paybill_number || null, account_prefix: v.data.account_prefix || null, approval_levels: v.data.approval_levels, minimum_web_operators: 2, maker_checker_required: true, initiator_may_approve_own_transaction: false, updated_by: locals.user?.id ?? null }, { onConflict: 'tenant_id' });
    if (error) return fail(500, { message: error.message });
    return { success: true, message: 'PayBill governance settings saved.' };
  },
  deactivate: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { message: 'Assignment not found.' });
    await locals.srv.from('remedial_paybill_operators').update({ active: false, effective_to: new Date().toISOString() }).eq('id', v.data.id).eq('tenant_id', tenantId);
    return { success: true, message: 'Operator assignment deactivated.' };
  },
} satisfies Actions;
