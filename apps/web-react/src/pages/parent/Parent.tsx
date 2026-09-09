import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParentScope } from '@/hooks/useParentScope';
import { useInvoices } from '@/hooks/useFinance';
import { DataTable } from '@/components/DataTable';
import { Button, Input, LoadingButton } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';

export function ParentDashboard() {
  const scope = useParentScope();
  const { data: invoices = [] } = useInvoices();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Parent portal</h1>
      <p className="text-sm">Linked students: {scope.data?.studentIds.length ?? '…'}</p>
      <DataTable columns={['Due', 'Paid', 'Status']} rows={invoices.slice(0, 20).map((i) => [i.amount_due, i.amount_paid, i.status])} />
    </div>
  );
}

export function ParentPay() {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [studentId, setStudentId] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('stk', {
        body: { phone, amount: Number(amount), student_id: studentId || undefined },
      });
      if (error) throw error;
      setMsg(`STK sent. Status: ${JSON.stringify(data)}`);
    } catch (e) {
      setMsg(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md space-y-3">
      <h1 className="text-xl font-semibold">Pay fees (M-Pesa)</h1>
      <Input placeholder="Phone 2547…" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      <Input placeholder="Student ID (optional)" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
      <LoadingButton loading={busy} onClick={pay}>Send STK push</LoadingButton>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

export function ParentPayments() {
  const { data } = useQuery({
    queryKey: ['parent-checkouts'],
    queryFn: async () => {
      const { data } = await supabase.from('checkout_requests').select('*').order('created_at', { ascending: false }).limit(50);
      return (data ?? []) as Record<string, unknown>[];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My payments</h1>
      <DataTable columns={['Amount', 'Status', 'Date']} rows={(data ?? []).map((r) => [r.amount, r.status, r.created_at])} />
    </div>
  );
}

export function Timetable({ who }: { who: string }) {
  const { data } = useQuery({
    queryKey: ['timetable', who],
    queryFn: async () => {
      const { data } = await supabase.from('sessions').select('*').order('scheduled_for').limit(50);
      return (data ?? []) as Record<string, unknown>[];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Timetable</h1>
      <DataTable columns={['Session', 'Scheduled', 'Status']} rows={(data ?? []).map((r) => [r.id, r.scheduled_for, r.status])} />
      <Button onClick={() => {}}>Export</Button>
    </div>
  );
}
