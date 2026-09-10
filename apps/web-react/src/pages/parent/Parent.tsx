import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { Input, LoadingButton } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Obligation = {
  obligation_id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  fee_name: string;
  period_label: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: string;
};

type Payment = {
  transaction_id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  amount: number;
  status: string;
  checkout_id?: string | null;
  receipt_number?: string | null;
  created_at: string;
};

async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return (data ?? []) as T;
}

function money(value: number) {
  return `KES ${Number(value ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ParentDashboard() {
  const { data: obligations = [], isLoading } = useQuery({
    queryKey: ['parent-reclass-obligations'],
    queryFn: () => callRpc<Obligation[]>('get_parent_reclass_obligations', {}),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ['parent-reclass-payments'],
    queryFn: () => callRpc<Payment[]>('get_parent_reclass_payments', {}),
  });

  const outstanding = useMemo(() => obligations.reduce((sum, item) => sum + Number(item.balance || 0), 0), [obligations]);
  const completed = payments.filter((payment) => payment.status === 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Parent portal</h1>
        <p className="text-sm text-muted-foreground">View ReClass obligations and track M-Pesa payments for your linked students.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mt-1 text-2xl font-semibold">{money(outstanding)}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Linked obligations</p><p className="mt-1 text-2xl font-semibold">{obligations.length}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Completed payments</p><p className="mt-1 text-2xl font-semibold">{completed.length}</p></div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading obligations…</p> : (
        <DataTable
          columns={['Student', 'Fee', 'Period', 'Amount', 'Paid', 'Balance', 'Status']}
          rows={obligations.map((item) => [item.student_name, item.fee_name, item.period_label, money(item.amount), money(item.paid_amount), money(item.balance), item.status])}
          empty="No ReClass obligations found."
        />
      )}
    </div>
  );
}

export function ParentPay() {
  const queryClient = useQueryClient();
  const [obligationId, setObligationId] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');

  const { data: obligations = [] } = useQuery({
    queryKey: ['parent-reclass-obligations'],
    queryFn: () => callRpc<Obligation[]>('get_parent_reclass_obligations', {}),
  });

  const payable = obligations.filter((item) => Number(item.balance) > 0 && item.status !== 'cancelled');
  const selected = payable.find((item) => item.obligation_id === obligationId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select an outstanding obligation.');
      const requested = Number(amount);
      if (!Number.isFinite(requested) || requested <= 0 || requested > Number(selected.balance)) {
        throw new Error('Enter an amount greater than zero and no more than the outstanding balance.');
      }
      const { data, error } = await supabase.functions.invoke('reclass-stk', {
        body: { obligation_id: selected.obligation_id, amount: requested, phone },
      });
      if (error) throw error;
      return data as { customer_message?: string; checkout_request_id?: string };
    },
    onSuccess: (data) => {
      setMsg(data.customer_message ?? 'STK push sent. Complete the prompt on your phone.');
      queryClient.invalidateQueries({ queryKey: ['parent-reclass-payments'] });
    },
    onError: (error) => setMsg(`Payment failed: ${error instanceof Error ? error.message : String(error)}`),
  });

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Pay ReClass fees</h1>
        <p className="text-sm text-muted-foreground">The payment is limited to obligations belonging to your linked students.</p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Obligation</span>
        <select className="h-10 w-full rounded-md border bg-background px-3" value={obligationId} onChange={(e) => { setObligationId(e.target.value); const item = payable.find((o) => o.obligation_id === e.target.value); setAmount(item ? String(item.balance) : ''); }}>
          <option value="">Select an outstanding obligation</option>
          {payable.map((item) => <option key={item.obligation_id} value={item.obligation_id}>{item.student_name} — {item.fee_name} — {money(item.balance)} outstanding</option>)}
        </select>
      </label>
      <Input placeholder="M-Pesa phone e.g. 0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      {selected && <p className="text-xs text-muted-foreground">Outstanding balance: {money(selected.balance)}</p>}
      <LoadingButton loading={mutation.isPending} onClick={() => mutation.mutate()}>Send STK push</LoadingButton>
      {msg && <p className="rounded-md border bg-muted/30 p-3 text-sm">{msg}</p>}
    </div>
  );
}

export function ParentPayments() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['parent-reclass-payments'],
    queryFn: () => callRpc<Payment[]>('get_parent_reclass_payments', {}),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My ReClass payments</h1>
        <p className="text-sm text-muted-foreground">Only payments belonging to your linked students are shown.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading payments…</p> : (
        <DataTable
          columns={['Student', 'Amount', 'Status', 'Receipt', 'Date']}
          rows={data.map((item) => [item.student_name, money(item.amount), item.status, item.receipt_number ?? '—', formatDate(item.created_at)])}
          empty="No ReClass payments found."
        />
      )}
    </div>
  );
}

export function Timetable({ who }: { who: string }) {
  const { data } = useQuery({
    queryKey: ['timetable', who],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('*').order('scheduled_for').limit(50);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Timetable</h1>
      <DataTable columns={['Session', 'Scheduled', 'Status']} rows={(data ?? []).map((r) => [r.id, r.scheduled_for, r.status])} />
    </div>
  );
}
