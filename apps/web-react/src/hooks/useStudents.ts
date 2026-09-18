import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStudents(page = 1, pageSize = 50, search = '') {
  return useQuery({
    queryKey: ['students', page, search],
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select('id,admission_no,first_name,last_name,grade,status', { count: 'exact' })
        .is('deleted_at', null)
        .order('first_name')
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,admission_no.ilike.%${search}%`);
      const { data, count } = await q;
      return { rows: (data ?? []) as never[], total: count ?? 0 };
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
      const [enrollments, invoices, payments] = await Promise.all([
        supabase.from('sis_enrollments').select('*').eq('student_id', id),
        supabase.from('invoices').select('*').eq('student_id', id).is('deleted_at', null),
        supabase.from('payments').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(20),
      ]);
      return { student: data, enrollments: enrollments.data ?? [], invoices: invoices.data ?? [], payments: payments.data ?? [] };
    },
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from('students').insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

/** Grade + status distributions for the demographics chart (up to 2000 learners). */
export function useStudentDemographics() {
  return useQuery({
    queryKey: ['student-demographics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('grade,status')
        .is('deleted_at', null)
        .limit(2000);
      if (error) throw error;
      const byGrade = new Map<string, number>();
      const byStatus = new Map<string, number>();
      for (const s of (data ?? []) as { grade?: string | null; status?: string | null }[]) {
        byGrade.set(s.grade || 'Ungraded', (byGrade.get(s.grade || 'Ungraded') ?? 0) + 1);
        byStatus.set(s.status || 'unknown', (byStatus.get(s.status || 'unknown') ?? 0) + 1);
      }
      const grade = [...byGrade.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      const status = [...byStatus.entries()].map(([label, value]) => ({ label, value }));
      return { grade, status, total: (data ?? []).length };
    },
  });
}
