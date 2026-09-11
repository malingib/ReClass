import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeeTypes() {
  return useQuery({
    queryKey: ['fee-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_types').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });
}

/** Legacy invoice hook retained for compatibility. The current schema exposes remedial obligations instead. */
export function useInvoices(scope?: { studentId?: string }) {
  return useQuery({
    queryKey: ['invoices', scope?.studentId],
    queryFn: async () => [] as Record<string, unknown>[],
  });
}

/** Receipt data is exposed through the authoritative receipt/payment screens and RPCs. */
export function useReceipts() {
  return useQuery({
    queryKey: ['receipts'],
    queryFn: async () => [] as Record<string, unknown>[],
  });
}

export function usePayrollRuns(kind: 'school' | 'remedial') {
  return useQuery({
    queryKey: ['payroll-runs', kind],
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll_runs').select('*').eq('domain', kind).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as { status: string; amount: number }[];
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
  return useQuery({
    queryKey: ['unmatched'],
    queryFn: async () => {
      const { data, error } = await supabase.from('unmatched_payments').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });
}
