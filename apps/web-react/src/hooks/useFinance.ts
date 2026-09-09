import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export function useFeeTypes() {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['fee-types', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('fee_types').select('*').eq('tenant_id', ctx!.tenantId).is('deleted_at', null).order('name');
      return (data ?? []) as Record<string, never>[];
    },
  });
}

export function useInvoices(scope?: { studentId?: string }) {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['invoices', ctx?.tenantId, scope?.studentId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      let q = supabase.from('invoices').select('*').eq('tenant_id', ctx!.tenantId).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
      if (scope?.studentId) q = q.eq('student_id', scope.studentId);
      const { data } = await q;
      return (data ?? []) as Record<string, never>[];
    },
  });
}

export function useReceipts() {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['receipts', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('receipts').select('*').eq('tenant_id', ctx!.tenantId).order('created_at', { ascending: false }).limit(100);
      return (data ?? []) as Record<string, never>[];
    },
  });
}

export function usePayrollRuns(kind: 'school' | 'remedial') {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['payroll-runs', ctx?.tenantId, kind],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('payroll_runs').select('*').eq('tenant_id', ctx!.tenantId).eq('domain', kind).order('created_at', { ascending: false });
      return ((data ?? []) as { status: string; amount: number }[]);
    },
  });
}

/** Privileged payroll transitions go through the payroll-ops Edge Function. */
export function usePayrollOp(kind: 'school' | 'remedial') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { op: 'generate' | 'approve' | 'mark-paid'; period_start?: string; period_end?: string; id?: string }) => {
      const { data, error } = await supabase.functions.invoke('payroll-ops', { body: { ...body, kind } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}

export function useUnmatchedPayments() {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['unmatched', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('unmatched_payments').select('*').eq('tenant_id', ctx!.tenantId).order('created_at', { ascending: false }).limit(100);
      return (data ?? []) as Record<string, never>[];
    },
  });
}
