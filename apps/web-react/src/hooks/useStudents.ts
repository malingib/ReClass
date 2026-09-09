import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export function useStudents(page = 1, pageSize = 50, search = '') {
  const { data: ctx } = useTenant();
  const tenantId = ctx?.tenantId;
  return useQuery({
    queryKey: ['students', tenantId, page, search],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select('id,admission_no,first_name,last_name,grade,status', { count: 'exact' })
        .eq('tenant_id', tenantId)
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
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['student', id],
    enabled: !!ctx?.tenantId && !!id,
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('id', id).eq('tenant_id', ctx!.tenantId).maybeSingle();
      const [enrollments, invoices, payments] = await Promise.all([
        supabase.from('sis_enrollments').select('*').eq('student_id', id).eq('tenant_id', ctx!.tenantId),
        supabase.from('invoices').select('*').eq('student_id', id).eq('tenant_id', ctx!.tenantId).is('deleted_at', null),
        supabase.from('payments').select('*').eq('student_id', id).eq('tenant_id', ctx!.tenantId).order('created_at', { ascending: false }).limit(20),
      ]);
      return { student: data, enrollments: enrollments.data ?? [], invoices: invoices.data ?? [], payments: payments.data ?? [] };
    },
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  const { data: ctx } = useTenant();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from('students').insert({ ...row, tenant_id: ctx!.tenantId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}
