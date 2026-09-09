import { useState } from 'react';
import { useInvoices, useReceipts, useUnmatchedPayments } from '@/hooks/useFinance';
import { DataTable } from '@/components/DataTable';
import { FeeManager } from '@/components/FeeManager';
import { PayrollPanel } from '@/components/PayrollPanel';
import { ReceiptModal } from '@/components/ReceiptModal';
import { Button } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';

export function FinanceOverview() {
  const { data: invoices = [] } = useInvoices();
  const due = invoices.reduce((n, i) => n + Number(i.amount_due ?? 0), 0);
  const paid = invoices.reduce((n, i) => n + Number(i.amount_paid ?? 0), 0);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Finance</h1>
      <p className="text-sm">Invoiced: KES {due.toLocaleString()} · Paid: KES {paid.toLocaleString()} · Outstanding: KES {Math.max(0, due - paid).toLocaleString()}</p>
      <DataTable columns={['Student', 'Due', 'Paid', 'Status']} rows={invoices.slice(0, 50).map((i) => [i.student_id, i.amount_due, i.amount_paid, i.status])} />
    </div>
  );
}

export function Fees() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fee types</h1>
      <FeeManager />
    </div>
  );
}

export function PaymentDefinitions() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payment definitions</h1>
      <FeeManager />
    </div>
  );
}

export function SchoolPayroll() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">School payroll</h1>
      <PayrollPanel kind="school" />
    </div>
  );
}

export function RemedialPayroll() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Remedial payroll</h1>
      <PayrollPanel kind="remedial" />
    </div>
  );
}

export function Receipts() {
  const { data: receipts = [], isLoading } = useReceipts();
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Receipts</h1>
      {isLoading ? <p className="text-sm opacity-70">Loading…</p> : (
        <DataTable columns={['Receipt', 'Amount', 'Date', '']} rows={receipts.map((r) => [r.receipt_no, r.amount, r.created_at, <Button key="v" onClick={() => setOpen(r)}>View</Button>])} />
      )}
      {open && <ReceiptModal receipt={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function UnmatchedPayments() {
  const { data: rows = [] } = useUnmatchedPayments();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Unmatched payments</h1>
      <DataTable columns={['Phone', 'Amount', 'Date', 'Reason']} rows={rows.map((r) => [r.phone, r.amount, r.created_at, r.reason])} />
    </div>
  );
}

export function FinanceReports() {
  const [msg, setMsg] = useState('');
  async function csv(report: string) {
    setMsg('');
    const { data, error } = await supabase.functions.invoke('reports-csv', { body: { report } });
    if (error) setMsg(`Failed: ${error.message}`);
    else {
      const blob = new Blob([data as string], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${report}.csv`;
      a.click();
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Finance reports</h1>
      <div className="flex flex-wrap gap-2">
        {['revenue', 'students', 'subjects', 'teacher-attendance', 'teachers'].map((r) => (
          <Button key={r} onClick={() => csv(r)}>{r}</Button>
        ))}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
