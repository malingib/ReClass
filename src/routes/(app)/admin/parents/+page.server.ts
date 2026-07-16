// @ts-nocheck
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const parentSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().optional(),
  locale: z.string().optional(),
  sms_consent: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod(parentSchema));
  const db = locals.srv;

  // Get parents
  const q = db.from('parents')
    .select('id, full_name, phone, email, locale, sms_consent, created_at')
    .order('full_name');
  if (locals.tenantId) q.eq('tenant_id', locals.tenantId);
  const { data: parents } = await q;

  // Get linked students for all parents
  if (parents && parents.length > 0) {
    const parentIds = parents.map(p => p.id);
    const { data: links } = await db
      .from('guardians_link')
      .select('parent_id, students(id, first_name, last_name, admission_no, grade)')
      .in('parent_id', parentIds);

    // Attach students to each parent
    const linkMap: Record<string, any[]> = {};
    for (const link of links ?? []) {
      if (!linkMap[link.parent_id]) linkMap[link.parent_id] = [];
      if (link.students) {
        linkMap[link.parent_id].push(link.students);
      }
    }
    for (const p of parents) {
      p.students = linkMap[p.id] ?? [];
    }
  }

  return { form, parents: parents ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod(parentSchema));
    if (!form.valid) return fail(400, { form });
    if (!locals.tenantId) return message(form, 'Tenant not found', { status: 500 });

    const { error } = await locals.srv.from('parents').insert({
      tenant_id: locals.tenantId,
      full_name: form.data.full_name,
      phone: form.data.phone,
      email: form.data.email || null,
      locale: form.data.locale || 'en',
      sms_consent: form.data.sms_consent ?? true,
    });
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Parent created successfully');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod(parentSchema));
    if (!form.valid) return fail(400, { form });
    if (!form.data.id) return message(form, 'ID required', { status: 400 });

    const { error } = await locals.srv.from('parents')
      .update({
        full_name: form.data.full_name,
        phone: form.data.phone,
        email: form.data.email || null,
        locale: form.data.locale || 'en',
        sms_consent: form.data.sms_consent ?? true,
      })
      .eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Parent updated successfully');
  },

  delete: async ({ locals, request }) => {
    const form = await superValidate(request, zod(deleteSchema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('parents').delete().eq('id', form.data.id);
    if (error) return message(form, `Failed: ${error.message}`, { status: 500 });
    return message(form, 'Parent deleted successfully');
  },
} satisfies Actions;
