import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';
import { createEnrollment, getEnrollmentOptions, getStudentsForEnrollment } from '$lib/server/_sis/lifecycle';

const schema = z.object({
  student_id: z.string().min(1), academic_year_id: z.string().min(1), year_group_id: z.string().min(1),
  stream_id: z.string().optional(), enrolled_on: z.string().min(1),
});

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const [options, students] = await Promise.all([getEnrollmentOptions(locals.srv, tenantId), getStudentsForEnrollment(locals.srv, tenantId)]);
  const db = locals.srv as unknown as { from: (table: string) => any };
  const { data: enrollments } = await db.from('enrollments').select('id, student_id, academic_year_id, year_group_id, stream_id, enrolled_on, status, students(first_name,last_name,admission_no), academic_years(name), year_groups(name), streams(name)').eq('tenant_id', tenantId).order('enrolled_on', { ascending: false }).limit(200);
  return { ...options, students, enrollments: enrollments ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(schema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const result = await createEnrollment(locals.srv, { tenantId, studentId: v.data.student_id, academicYearId: v.data.academic_year_id, yearGroupId: v.data.year_group_id, streamId: v.data.stream_id || null, enrolledOn: v.data.enrolled_on, actorId: locals.user?.id ?? null });
    if (!result.ok) return fail(result.error.code === '23505' ? 409 : 400, { message: result.error.message ?? 'Could not enroll student.' });
    return { success: true, message: 'Student enrolled. Previous enrollments remain unchanged.' };
  },
} satisfies Actions;
