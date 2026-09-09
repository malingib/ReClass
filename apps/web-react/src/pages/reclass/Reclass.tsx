import { useState } from 'react';
import { useAttendance, useRemedialDashboard } from '@/hooks/useRemedial';
import { useInvoices, useReceipts } from '@/hooks/useFinance';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui';
import { PayrollPanel } from '@/components/PayrollPanel';
import { FeeManager } from '@/components/FeeManager';

export function ReclassDashboard() {
  const { data } = useRemedialDashboard();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ReClass</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard label="Active enrollments" value={data?.activeEnrollments ?? '…'} />
        <KpiCard label="Recent sessions" value={data?.sessions.length ?? '…'} />
        <KpiCard label="Attendance rows" value={data?.attendance.length ?? '…'} />
      </div>
      <DataTable columns={['Session', 'Status', 'Scheduled']} rows={(data?.sessions ?? []).map((s) => {
        const r = s as { id?: string; status?: string; scheduled_for?: string };
        return [r.id, r.status, r.scheduled_for];
      })} />
    </div>
  );
}

export function Attendance() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAttendance(page, 50);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Remedial attendance</h1>
      {isLoading ? <p className="text-sm opacity-70">Loading…</p> : (
        <DataTable columns={['Teacher', 'Status', 'Date']} rows={(data?.rows ?? []).map((r) => {
          const t = (r.teachers ?? {}) as { first_name?: string; last_name?: string };
          return [`${t.first_name ?? ''} ${t.last_name ?? ''}`, r.status, r.marked_at];
        })} />
      )}
      <div className="flex gap-2 text-sm">
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <span className="p-2">Page {page} · {data?.total ?? 0}</span>
        <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function RemedialFees() {
  const { data: invoices = [] } = useInvoices();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Remedial fees</h1>
      <FeeManager />
      <DataTable columns={['Student', 'Due', 'Paid', 'Status']} rows={invoices.slice(0, 50).map((i) => [i.student_id, i.amount_due, i.amount_paid, i.status])} />
    </div>
  );
}

export function ParentPayments() {
  const { data: receipts = [] } = useReceipts();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Parent payments</h1>
      <DataTable columns={['Receipt', 'Amount', 'Date']} rows={receipts.map((r) => [r.receipt_no, r.amount, r.created_at])} />
    </div>
  );
}

export function Committee() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Committee</h1>
      <p className="text-sm opacity-70">Review/approve attendance; treasurer prepares payroll, chairman approves. Enforcement lives in payroll-ops + RLS.</p>
      <Attendance />
    </div>
  );
}

export { RemedialPayroll } from '@/pages/finance/Finance';
