// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const enrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  group_id: z.string().min(1, 'Group is required'),
});

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(enrollmentSchema));
  const sb = locals.srv;
  const tid = locals.tenantId;

  const { data: enrollments } = await sb
    .from('students').select('id, admission_no, first_name, last_name, grade, status, created_at')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false }).limit(100);

  const { data: students } = await sb
    .from('students').select('id, admission_no, first_name, last_name')
    .eq('tenant_id', tid)
    .eq('status', 'active')
    .order('first_name');

  const { data: groups } = await sb
    .from('remedial_groups').select('id, name, room, capacity')
    .eq('tenant_id', tid)
    .order('name');

  return { form, enrollments: enrollments ?? [], students: students ?? [], groups: groups ?? [] };
};

export const actions = {
  enroll: async ({ locals, request }) => {
    const form = await superValidate(request, zod(enrollmentSchema));
    if (!form.valid) return fail(400, { form });
    try {
      const { error } = await locals.srv.from('group_members').insert({
        student_id: form.data.student_id,
        group_id: form.data.group_id,
        tenant_id: locals.tenantId,
      });
      if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    } catch (e: any) {
      return message(form, `Enrollment not available: ${e?.message ?? 'table not ready'}`, { status: 500 });
    }
    return message(form, 'Student enrolled successfully');
  },

  unenroll: async ({ locals, request }) => {
    const fd = await request.formData();
    const sid = fd.get('student_id') as string;
    const gid = fd.get('group_id') as string;
    if (!sid || !gid) return fail(400, { error: 'Both student and group are required' });
    try {
      const { error } = await locals.srv.from('group_members').delete()
        .eq('student_id', sid)
        .eq('group_id', gid);
      if (error) return fail(500, { error: `Failed: ${error.message}` });
    } catch (e: any) {
      return fail(500, { error: `Enrollment not available: ${e?.message ?? 'table not ready'}` });
    }
    return { success: true };
  },
} satisfies Actions;
