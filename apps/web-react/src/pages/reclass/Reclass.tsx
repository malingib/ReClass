import { useState } from 'react';
import { CalendarCheck2, CheckCircle2, CircleDollarSign, Clock3, UsersRound } from 'lucide-react';
import { useAttendance, useRemedialDashboard } from '@/hooks/useRemedial';
import { useInvoices, useReceipts } from '@/hooks/useFinance';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { FeeManager } from '@/components/FeeManager';

const money = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `KES ${amount.toLocaleString()}` : '—';
};

const dateLabel = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">ReClass operations</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ReclassDashboard() {
  const { data } = useRemedialDashboard();
  const sessions = data?.sessions ?? [];
  const attendance = data?.attendance ?? [];
  return (
    <div className="space-y-6">
      <PageHeading title="ReClass dashboard" description="A live view of remedial enrolment, sessions and attendance." action={<Button>New session</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active enrollments" value={data?.activeEnrollments ?? '…'} icon={UsersRound} />
        <KpiCard label="Recent sessions" value={sessions.length} icon={CalendarCheck2} />
        <KpiCard label="Attendance rows" value={attendance.length} icon={CheckCircle2} />
        <KpiCard label="Open actions" value="—" icon={Clock3} trend="Review pending operational work" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader>
          <CardContent className="p-0"><DataTable columns={['Session', 'Status', 'Scheduled']} rows={sessions.slice(0, 8).map((s) => { const r = s as { id?: string; status?: string; scheduled_for?: string }; return [r.id ?? '—', r.status ?? '—', dateLabel(r.scheduled_for)]; })} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Operational focus</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-md border p-3"><div className="rounded-md bg-secondary p-2 text-secondary-foreground"><CalendarCheck2 className="size-4" /></div><div><p className="text-sm font-medium">Attendance</p><p className="text-xs text-muted-foreground">Keep teacher attendance current.</p></div></div>
            <div className="flex items-center gap-3 rounded-md border p-3"><div className="rounded-md bg-accent p-2 text-accent-foreground"><CircleDollarSign className="size-4" /></div><div><p className="text-sm font-medium">Fee follow-up</p><p className="text-xs text-muted-foreground">Review unpaid remedial obligations.</p></div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Attendance() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAttendance(page, 50);
  return (
    <div className="space-y-6">
      <PageHeading title="Remedial attendance" description="Record and review teacher attendance for remedial sessions." />
      <Card>
        <CardHeader><CardTitle>Attendance register</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading attendance…</div> : <DataTable columns={['Teacher', 'Status', 'Date']} rows={(data?.rows ?? []).map((r) => { const t = (r.teachers ?? {}) as { first_name?: string; last_name?: string }; return [`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || '—', r.status ?? '—', dateLabel(r.marked_at)]; })} />}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
        <span className="text-muted-foreground">Page {page} · {data?.total ?? 0} records</span>
        <div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" onClick={() => setPage((p) => p + 1)}>Next</Button></div>
      </div>
    </div>
  );
}

export function RemedialFees() {
  const { data: invoices = [] } = useInvoices();
  return (
    <div className="space-y-6">
      <PageHeading title="Remedial fees" description="Manage remedial charges and monitor parent balances." />
      <FeeManager />
      <Card><CardHeader><CardTitle>Fee ledger</CardTitle></CardHeader><CardContent className="p-0"><DataTable columns={['Student', 'Due', 'Paid', 'Status']} rows={invoices.slice(0, 50).map((i) => [i.student_id ?? '—', money(i.amount_due), money(i.amount_paid), i.status ?? '—'])} /></CardContent></Card>
    </div>
  );
}

export function ParentPayments() {
  const { data: receipts = [] } = useReceipts();
  return (
    <div className="space-y-6">
      <PageHeading title="Parent payments" description="Track receipts generated from remedial fee payments." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><KpiCard label="Receipts" value={receipts.length} icon={CircleDollarSign} /><KpiCard label="Collected" value={money(receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0))} icon={CheckCircle2} /></div>
      <Card><CardHeader><CardTitle>Payment receipts</CardTitle></CardHeader><CardContent className="p-0"><DataTable columns={['Receipt', 'Amount', 'Date']} rows={receipts.slice(0, 50).map((r) => [r.receipt_no ?? '—', money(r.amount), dateLabel(r.created_at)])} /></CardContent></Card>
    </div>
  );
}

export function Committee() {
  return (
    <div className="space-y-6">
      <PageHeading title="Remedial committee" description="Review attendance and prepare operational approvals. Authorization remains enforced server-side." />
      <Card><CardHeader><CardTitle>Committee review</CardTitle></CardHeader><CardContent><Attendance /></CardContent></Card>
    </div>
  );
}

export { RemedialPayroll } from '@/pages/finance/Finance';
