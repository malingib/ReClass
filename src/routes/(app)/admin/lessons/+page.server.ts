import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const schema = z.object({ teacher_id: z.string().min(1), subject_id: z.string().optional(), class_id: z.string().min(1), starts_at: z.string().min(1), ends_at: z.string().min(1), room: z.string().max(100).optional(), notes: z.string().max(1000).optional() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const db = locals.srv as unknown as { from: (table: string) => any };
  const [{ data: lessons }, { data: teachers }, { data: subjects }, { data: classes }] = await Promise.all([
    db.from('lessons').select('id,starts_at,ends_at,room,status,notes,teachers(first_name,last_name),subjects(name),sis_classes(name,stream,code)').eq('tenant_id', tenantId).is('deleted_at', null).order('starts_at', { ascending: true }).limit(300),
    db.from('teachers').select('id,first_name,last_name').eq('tenant_id', tenantId).is('deleted_at', null).order('first_name'),
    db.from('subjects').select('id,name').eq('tenant_id', tenantId).is('deleted_at', null).order('name'),
    db.from('sis_classes').select('id,name,stream,code,academic_year').eq('tenant_id', tenantId).eq('status', 'active').order('name')
  ]);
  return { lessons: lessons ?? [], teachers: teachers ?? [], subjects: subjects ?? [], classes: classes ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(schema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const db = locals.srv as unknown as { from: (table: string) => any };
    const { error } = await db.from('lessons').insert({ tenant_id: tenantId, teacher_id: v.data.teacher_id, subject_id: v.data.subject_id || null, class_id: v.data.class_id, starts_at: v.data.starts_at, ends_at: v.data.ends_at, room: v.data.room || null, notes: v.data.notes || null, created_by: locals.user?.id || null });
    if (error) return fail(500, { message: error.message });
    return { success: true, message: 'Lesson scheduled.' };
  },
  cancel: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const id = String((await request.formData()).get('id') ?? '');
    if (!id) return fail(400, { message: 'Lesson ID required.' });
    const db = locals.srv as unknown as { from: (table: string) => any };
    const { error } = await db.from('lessons').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
    if (error) return fail(500, { message: error.message });
    return { success: true, message: 'Lesson cancelled.' };
  }
} satisfies Actions;
