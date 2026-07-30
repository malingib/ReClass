import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, studentIds } = await getParentOwnership(locals);
  if (studentIds.length === 0) return { students: [], results: [], exam: null };

  const { data: students } = await locals.srv
    .from('students')
    .select('id, first_name, last_name, admission_no, grade')
    .eq('tenant_id', tenantId)
    .in('id', studentIds);

  const { data: examResults } = await locals.srv
    .from('exam_results')
    .select('id, score, grade, remarks, exam_id, subject_id, student_id, exams!inner(name, term, exam_date, max_score)')
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  const subjectIds = [...new Set((examResults ?? []).map(r => r.subject_id))];
  const { data: subjects } = subjectIds.length > 0
    ? await locals.srv.from('subjects').select('id, name, code').in('id', subjectIds).eq('tenant_id', tenantId)
    : { data: [] };
  const subjectMap = new Map((subjects ?? []).map(s => [s.id, s.name]));

  const studentsList = students ?? [];
  const resultsList = (examResults ?? []).map(r => ({
    ...r,
    subject_name: subjectMap.get(r.subject_id) ?? 'Unknown',
  }));

  return { students: studentsList, results: resultsList };
};
