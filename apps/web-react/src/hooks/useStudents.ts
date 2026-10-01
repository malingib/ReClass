import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Escape PostgREST LIKE wildcards so user search input can't widen the match. */
export function sanitizeLike(raw: string): string {
  return raw.replace(/([%_\\])/g, '\\$1');
}

export type StudentParent = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  is_primary: boolean | null;
};

export function useStudents(page = 1, pageSize = 50, search = '') {
  return useQuery({
    queryKey: ['students', page, search],
    queryFn: async () => {
      const term = sanitizeLike(search.trim());
      let q = supabase
        .from('students')
        .select('id,admission_no,first_name,last_name,grade,status', { count: 'exact' })
        .is('deleted_at', null)
        .order('first_name')
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_no.ilike.%${term}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as never[], total: count ?? 0 };
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (studentError) throw studentError;
      if (!student) return { student: null, parent: null as StudentParent | null, enrollments: [], invoices: [], payments: [] };

      const [enrollments, invoices, payments, links] = await Promise.all([
        supabase.from('sis_enrollments').select('*').eq('student_id', id),
        supabase.from('invoices').select('*').eq('student_id', id).is('deleted_at', null),
        supabase.from('payments').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('guardians_link').select('parent_id,relationship,is_primary').eq('student_id', id),
      ]);
      if (enrollments.error) throw enrollments.error;
      if (invoices.error) throw invoices.error;
      if (payments.error) throw payments.error;
      if (links.error) throw links.error;

      let parent: StudentParent | null = null;
      const rows = (links.data ?? []) as { parent_id: string; relationship: string | null; is_primary: boolean | null }[];
      if (rows.length > 0) {
        const primary = rows.find((r) => r.is_primary) ?? rows[0];
        const { data: parentRow, error: parentError } = await supabase
          .from('parents')
          .select('id,full_name,phone,email')
          .eq('id', primary.parent_id)
          .maybeSingle();
        if (parentError) throw parentError;
        if (parentRow) {
          const p = parentRow as { id: string; full_name: string | null; phone: string | null; email: string | null };
          parent = { ...p, relationship: primary.relationship, is_primary: primary.is_primary };
        }
      }

      return {
        student,
        parent,
        enrollments: enrollments.data ?? [],
        invoices: invoices.data ?? [],
        payments: payments.data ?? [],
      };
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
