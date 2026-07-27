import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

const examSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  term: z.string().optional(),
  exam_date: z.string().optional(),
  max_score: z.coerce.number().positive('Must be positive'),
});

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [examsRes, subjectsRes] = await Promise.all([
    locals.srv.from('exams').select('id, name, term, exam_date, max_score, created_at').eq('tenant_id', tenantId).order('exam_date', { ascending: false, nullsFirst: false }),
    locals.srv.from('subjects').select('id, name, code').eq('tenant_id', tenantId).order('name'),
  ]);

  return {
    exams: examsRes.data ?? [],
    subjects: subjectsRes.data ?? [],
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const parsed = examSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return fail(400, { errors: parsed.error.flatten().fieldErrors });

    const { error } = await locals.srv.from('exams').insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      term: parsed.data.term || null,
      exam_date: parsed.data.exam_date || null,
      max_score: parsed.data.max_score,
      created_by: user.id,
    });
    if (error) return fail(500, { message: error.message });
    return { success: true };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const id = fd.get('id') as string;
    if (!id) return fail(400, { message: 'ID required' });

    const { error } = await locals.srv.from('exams').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) return fail(500, { message: error.message });
    return { success: true };
  },
};
