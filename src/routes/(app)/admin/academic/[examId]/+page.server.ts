import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, params }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [examRes, resultsRes] = await Promise.all([
    locals.srv.from('exams').select('*').eq('id', params.examId).eq('tenant_id', tenantId).maybeSingle(),
    locals.srv
      .from('exam_results')
      .select('id, score, grade, remarks, student_id, subject_id, created_at')
      .eq('tenant_id', tenantId)
      .eq('exam_id', params.examId),
  ]);

  if (!examRes.data) {
    return { exam: null, results: [], subjects: [] };
  }

  const subjectIds = [...new Set((resultsRes.data ?? []).map(r => r.subject_id))];
  const studentIds = [...new Set((resultsRes.data ?? []).map(r => r.student_id))];

  const [subjectsRes, studentsRes] = await Promise.all([
    subjectIds.length > 0
      ? locals.srv.from('subjects').select('id, name, code').in('id', subjectIds).eq('tenant_id', tenantId)
      : { data: [] },
    studentIds.length > 0
      ? locals.srv.from('students').select('id, first_name, last_name, admission_no').in('id', studentIds).eq('tenant_id', tenantId)
      : { data: [] },
  ]);

  const subjectMap = new Map((subjectsRes.data ?? []).map(s => [s.id, s]));
  const studentMap = new Map((studentsRes.data ?? []).map(s => [s.id, s]));

  return {
    exam: examRes.data,
    results: (resultsRes.data ?? []).map(r => ({
      ...r,
      subject_name: subjectMap.get(r.subject_id)?.name ?? 'Unknown',
      student_name: studentMap.get(r.student_id)
        ? `${studentMap.get(r.student_id)!.first_name} ${studentMap.get(r.student_id)!.last_name}`
        : 'Unknown',
    })),
  };
};
