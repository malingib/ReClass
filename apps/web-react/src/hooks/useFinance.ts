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

export type InvoiceRow = {
  id: string;
  student_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  created_at?: string;
  student?: { first_name?: string | null; last_name?: string | null; admission_no?: string | null } | null;
};

/** Paginated school-finance invoices with student names joined. */
export function useInvoices(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['invoices', page, pageSize],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('invoices')
        .select('id,student_id,amount_due,amount_paid,status,created_at,student:students(first_name,last_name,admission_no)', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as InvoiceRow[], total: count ?? 0 };
    },
  });
}

export type ReceiptRow = {
  id: string;
  receipt_no?: string | null;
  amount: number;
  status: string;
  created_at?: string;
  student_id?: string | null;
  domain?: string | null;
  student?: { first_name?: string | null; last_name?: string | null; admission_no?: string | null } | null;
};

/** Actual payment evidence: payments carrying a receipt number, newest first.
 *  Covers both domains — school fees and remedial (ReClass) fees share the
 *  ledger; callers separate them with paymentDomainLabel/isSchoolPayment. */
export function useReceipts(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['receipts', page, pageSize],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('payments')
        .select('id,receipt_no,amount,status,created_at,student_id,domain,student:students(first_name,last_name,admission_no)', { count: 'exact' })
        .not('receipt_no', 'is', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as ReceiptRow[], total: count ?? 0 };
    },
  });
}

export function usePayrollRuns(kind: 'school' | 'remedial') {
  return useQuery({
    queryKey: ['payroll-runs', kind],
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll_runs').select('*').eq('domain', kind).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; period_start: string; period_end: string; amount: number; status: string }[];
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

export type FeeCollectionSlice = {
  id: string;
  name: string;
  term?: string | null;
  due: number;
  paid: number;
  count: number;
};

/** Term collection progress: fee types joined with invoice aggregates. */
export function useFeeCollection() {
  return useQuery({
    queryKey: ['fee-collection'],
    queryFn: async () => {
      const [fees, invoices] = await Promise.all([
        supabase.from('fee_types').select('id,name,term').is('deleted_at', null).order('name'),
        supabase.from('invoices').select('fee_type_id,amount_due,amount_paid').is('deleted_at', null).limit(2000),
      ]);
      if (fees.error) throw fees.error;
      if (invoices.error) throw invoices.error;
      const byFee = new Map<string, { due: number; paid: number; count: number }>();
      for (const inv of (invoices.data ?? []) as { fee_type_id?: string | null; amount_due?: number; amount_paid?: number }[]) {
        const key = inv.fee_type_id ?? '__none__';
        const agg = byFee.get(key) ?? { due: 0, paid: 0, count: 0 };
        agg.due += Number(inv.amount_due ?? 0);
        agg.paid += Number(inv.amount_paid ?? 0);
        agg.count += 1;
        byFee.set(key, agg);
      }
      const perFee: FeeCollectionSlice[] = ((fees.data ?? []) as { id: string; name: string; term?: string | null }[]).map((f) => ({
        id: f.id,
        name: f.name,
        term: f.term ?? null,
        ...(byFee.get(f.id) ?? { due: 0, paid: 0, count: 0 }),
      }));
      const unlinked = byFee.get('__none__');
      const totalDue = perFee.reduce((n, f) => n + f.due, 0) + (unlinked?.due ?? 0);
      const totalPaid = perFee.reduce((n, f) => n + f.paid, 0) + (unlinked?.paid ?? 0);
      const totalCount = perFee.reduce((n, f) => n + f.count, 0) + (unlinked?.count ?? 0);
      return { perFee, totalDue, totalPaid, totalCount };
    },
  });
}
