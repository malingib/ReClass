import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, params }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [examRes, studentsRes, subjectsRes, resultsRes] = await Promise.all([
    locals.srv.from('exams').select('*').eq('id', params.examId).eq('tenant_id', tenantId).maybeSingle(),
    locals.srv.from('students').select('id, first_name, last_name, admission_no').eq('tenant_id', tenantId).eq('status', 'active').order('first_name'),
    locals.srv.from('subjects').select('id, name, code').eq('tenant_id', tenantId).order('name'),
    locals.srv.from('exam_results').select('student_id, subject_id, score, grade, remarks, id').eq('exam_id', params.examId).eq('tenant_id', tenantId),
  ]);

  return {
    exam: examRes.data,
    students: studentsRes.data ?? [],
    subjects: subjectsRes.data ?? [],
    existingResults: resultsRes.data ?? [],
  };
};

const resultSchema = z.object({
  student_id: z.string(),
  subject_id: z.string(),
  score: z.coerce.number().min(0),
  grade: z.string().optional(),
  remarks: z.string().optional(),
});

export const actions = {
  save: async ({ locals, request, params }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin');

    const fd = await request.formData();
    let parsed: unknown;
    try {
      parsed = JSON.parse(fd.get('entries') as string);
    } catch {
      return fail(400, { message: 'Invalid entries JSON' });
    }

    if (Array.isArray(parsed) && parsed.length === 0) {
      return { success: true };
    }

    // Validate every entry against the schema
    const schemaResult = z.array(resultSchema).safeParse(parsed);
    if (!schemaResult.success) {
      return fail(400, { message: 'Invalid entry format', errors: schemaResult.error.flatten() });
    }
    const entries = schemaResult.data;

    // Verify the exam exists and belongs to the tenant
    const { data: exam } = await locals.srv
      .from('exams')
      .select('id')
      .eq('id', params.examId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!exam) return fail(404, { message: 'Exam not found' });

    // Validate all student IDs belong to the tenant
    const studentIds = [...new Set(entries.map(e => e.student_id))];
    const { data: validStudents } = await locals.srv
      .from('students')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', studentIds);
    const validStudentSet = new Set((validStudents ?? []).map(s => s.id));
    const invalidStudents = studentIds.filter(id => !validStudentSet.has(id));
    if (invalidStudents.length > 0) {
      return fail(400, { message: `Invalid students: ${invalidStudents.join(', ')}` });
    }

    // Validate all subject IDs belong to the tenant
    const subjectIds = [...new Set(entries.map(e => e.subject_id))];
    const { data: validSubjects } = await locals.srv
      .from('subjects')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', subjectIds);
    const validSubjectSet = new Set((validSubjects ?? []).map(s => s.id));
    const invalidSubjects = subjectIds.filter(id => !validSubjectSet.has(id));
    if (invalidSubjects.length > 0) {
      return fail(400, { message: `Invalid subjects: ${invalidSubjects.join(', ')}` });
    }

    // Atomic replacement: delete existing results, then insert new ones
    const { error: delError } = await locals.srv
      .from('exam_results')
      .delete()
      .eq('exam_id', params.examId)
      .eq('tenant_id', tenantId);
    if (delError) return fail(500, { message: delError.message });

    const insertData = entries.map(e => ({
      tenant_id: tenantId,
      exam_id: params.examId,
      student_id: e.student_id,
      subject_id: e.subject_id,
      score: e.score,
      grade: e.grade || null,
      remarks: e.remarks || null,
      created_by: user.id,
    }));

    const { error } = await locals.srv.from('exam_results').insert(insertData);
    if (error) return fail(500, { message: error.message });
    return { success: true };
  },
};
