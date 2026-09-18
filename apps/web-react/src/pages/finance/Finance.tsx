import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFeeCollection, useInvoices, useReceipts, useUnmatchedPayments } from '@/hooks/useFinance';
import { useSchool } from '@/hooks/useSchool';
import { DataTable } from '@/components/DataTable';
import { FeeManager } from '@/components/FeeManager';
import { PayrollPanel } from '@/components/PayrollPanel';
import { ReceiptModal } from '@/components/ReceiptModal';
import { PaymentList, type PaymentItem } from '@/components/PaymentList';
import { ProgressCard } from '@/components/ProgressCard';
import { ResponsiveGrid } from '@/components/ResponsiveGrid';
import { CashflowChart, DateRangeFilter, ReportsSubnav, TrendAreaChart, type MonthlySeries, type ReportDateRange } from '@/components/reports';
import { Button, EmptyState, LoadingButton, PageHeader, StatusPill, TableSkeleton } from '@/components/ui';
import { dateKE, datetimeKE, fullName, moneyKES, phoneDisplay } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';

function ServerPager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
      <span className="text-muted-foreground">Page {page} of {pages} · {total} records</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
}

/** Collection trend + position charts with a working date-range filter. */
function FinanceCharts() {
  const [range, setRange] = useState<ReportDateRange | null>(null);
  const { data: receipts } = useReceipts(1, 300);
  const { data: collection } = useFeeCollection();

  const series: MonthlySeries[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const r of receipts?.rows ?? []) {
      if (!r.created_at || String(r.status).toLowerCase() !== 'paid') continue;
      const d = new Date(r.created_at);
      if (Number.isNaN(d.getTime())) continue;
      if (range && (d < range.startDate || d > range.endDate)) continue;
      const agg = map.get(monthKey(d)) ?? { amount: 0, count: 0 };
      agg.amount += Number(r.amount ?? 0);
      agg.count += 1;
      map.set(monthKey(d), agg);
    }
    return [...map.entries()].sort().map(([key, v]) => ({ month: monthLabel(key), amount: v.amount, count: v.count }));
  }, [receipts, range]);

  const totalDue = collection?.totalDue ?? 0;
  const totalPaid = collection?.totalPaid ?? 0;
  const windowLabel = range ? `${range.startDate.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })} – ${range.endDate.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'all available history';

  return (
    <div className="space-y-4">
      <DateRangeFilter onApply={setRange} />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendAreaChart data={series} title="Collection trend" description={`Paid receipts per month · ${windowLabel}`} />
        </div>
        <div className="lg:col-span-2">
          <CashflowChart
            title="Collection position"
            description="Collected vs outstanding across all invoices"
            balances={[
              { name: 'Collected', balance: totalPaid },
              { name: 'Outstanding', balance: Math.max(0, totalDue - totalPaid) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export function FinanceOverview() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading, isError } = useInvoices(page, pageSize);
  const rows = data?.rows ?? [];
  const due = rows.reduce((n, i) => n + Number(i.amount_due ?? 0), 0);
  const paid = rows.reduce((n, i) => n + Number(i.amount_paid ?? 0), 0);
  return (
    <div className="space-y-4">
      <PageHeader title="Finance" description={`Invoiced ${moneyKES(due)} · Paid ${moneyKES(paid)} · Outstanding ${moneyKES(Math.max(0, due - paid))} (this page).`} />
      <FinanceCharts />
      {isLoading ? <TableSkeleton /> : isError ? (
        <EmptyState title="Could not load invoices" description="Check your connection and try again." action={<Button variant="outline" onClick={() => setPage(1)}>Retry</Button>} />
      ) : (
        <>
          <DataTable
            columns={['Student', 'Admission', 'Due', 'Paid', 'Status']}
            rows={rows.map((i) => [fullName(i.student?.first_name, i.student?.last_name), i.student?.admission_no ?? '—', moneyKES(i.amount_due), moneyKES(i.amount_paid), <StatusPill key={i.id} status={i.status} />])}
            empty="No invoices yet."
            pagination="server"
          />
          <ServerPager page={page} total={data?.total ?? 0} pageSize={pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export function Fees() {
  const { data: collection, isLoading } = useFeeCollection();
  const totalDue = collection?.totalDue ?? 0;
  const totalPaid = collection?.totalPaid ?? 0;
  const pct = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
  return (
    <div className="space-y-4">
      <PageHeader title="Fee types" description="Define what the school charges. Invoices are generated from these." />
      {isLoading ? (
        <TableSkeleton rows={2} />
      ) : (
        <ResponsiveGrid cols={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap="md">
          <ProgressCard
            title="Overall collection"
            badges={[{ label: `${collection?.totalCount ?? 0} invoices`, tone: 'secondary' }]}
            amountLabel="Collected"
            amount={moneyKES(totalPaid)}
            progress={pct}
            actualLabel={moneyKES(totalPaid)}
            expectedLabel={moneyKES(totalDue)}
          />
          {(collection?.perFee ?? []).map((f) => {
            const p = f.due > 0 ? (f.paid / f.due) * 100 : 0;
            return (
              <ProgressCard
                key={f.id}
                title={f.name}
                badges={[
                  ...(f.term ? [{ label: f.term, tone: 'outline' as const }] : []),
                  { label: `${f.count} invoices`, tone: 'secondary' as const },
                ]}
                amountLabel="Collected"
                amount={moneyKES(f.paid)}
                progress={p}
                actualLabel={moneyKES(f.paid)}
                expectedLabel={moneyKES(f.due)}
              />
            );
          })}
        </ResponsiveGrid>
      )}
      <FeeManager />
    </div>
  );
}

export function PaymentDefinitions() {
  return (
    <div className="space-y-4">
      <PageHeader title="Payment definitions" description="How each fee type is collected — M-Pesa STK or bank transfer." />
      <FeeManager />
    </div>
  );
}

export function SchoolPayroll() {
  return (
    <div className="space-y-4">
      <PageHeader title="School payroll" description="Teacher compensation runs. Generate, approve, then mark paid." />
      <PayrollPanel kind="school" />
    </div>
  );
}

export function RemedialPayroll() {
  return (
    <div className="space-y-4">
      <PageHeader title="Remedial payroll" description="ReClass teaching and committee compensation. Separation of duties applies." />
      <PayrollPanel kind="remedial" />
    </div>
  );
}

export function Receipts() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useReceipts(page, pageSize);
  const { data: school } = useSchool();
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);
  const rows = data?.rows ?? [];
  const paymentItems: PaymentItem[] = rows.map((r) => ({
    id: r.id,
    title: r.receipt_no ? `Receipt ${r.receipt_no}` : 'Receipt',
    description: `${fullName(r.student?.first_name, r.student?.last_name)}${r.student?.admission_no ? ` · ${r.student.admission_no}` : ''}`,
    amount: Number(r.amount ?? 0),
    direction: 'in',
    kind: 'fee',
    date: r.created_at ?? '',
    reference: r.receipt_no ?? undefined,
    status: r.status,
    actor: fullName(r.student?.first_name, r.student?.last_name),
  }));
  return (
    <div className="space-y-4">
      <PageHeader title="Receipts" description="Evidence of actual successful payments. Receipts are never edited — errors are corrected with reversals." />
      {isLoading ? <TableSkeleton /> : (
        <>
          <div className="md:hidden">
            <PaymentList items={paymentItems} empty="No receipts yet. Receipts appear automatically when M-Pesa payments complete." />
          </div>
          <div className="hidden md:block">
          <DataTable
            columns={['Receipt', 'Student', 'Amount', 'Date', 'Status', '']}
            rows={rows.map((r) => [r.receipt_no ?? '—', fullName(r.student?.first_name, r.student?.last_name), moneyKES(r.amount), datetimeKE(r.created_at), <StatusPill key={`s-${r.id}`} status={r.status} />, <Button key={`v-${r.id}`} variant="outline" size="sm" onClick={() => setOpen(r as unknown as Record<string, unknown>)}>View</Button>])}
            empty="No receipts yet. Receipts appear automatically when M-Pesa payments complete."
            pagination="server"
          />
          </div>
          <ServerPager page={page} total={data?.total ?? 0} pageSize={pageSize} onPage={setPage} />
        </>
      )}
      {open && <ReceiptModal receipt={open} schoolName={school?.name ?? 'eShule'} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function UnmatchedPayments() {
  const { data: rows = [], isLoading } = useUnmatchedPayments();
  const items: PaymentItem[] = rows.map((r, i) => ({
    id: String(r.id ?? `unmatched-${i}`),
    title: String(r.reason ?? 'Unmatched payment'),
    description: phoneDisplay(r.phone),
    amount: Number(r.amount ?? 0),
    direction: 'in',
    kind: 'other',
    date: String(r.created_at ?? ''),
    reference: typeof r.mpesa_receipt === 'string' ? r.mpesa_receipt : undefined,
    status: String(r.status ?? 'unmatched'),
  }));
  return (
    <div className="space-y-4">
      <PageHeader title="Unmatched payments" description="Money that arrived without a matching bill — usually a wrong admission number typed at the till. Resolve each row against the M-Pesa statement." />
      <PaymentList
        items={items}
        loading={isLoading}
        empty="Queue clear. Every shilling is matched."
      />
    </div>
  );
}

const REPORTS = [
  { id: 'revenue', label: 'Revenue', hint: 'Collections by period' },
  { id: 'students', label: 'Students', hint: 'Enrolment snapshot' },
  { id: 'subjects', label: 'Subjects', hint: 'Subject catalogue' },
  { id: 'teacher-attendance', label: 'Teacher attendance', hint: 'Delivery and approvals' },
  { id: 'teachers', label: 'Teachers', hint: 'Staff list' },
];

export function FinanceReports() {
  const [running, setRunning] = useState<string | null>(null);
  async function csv(report: string) {
    setRunning(report);
    try {
      const { data, error } = await supabase.functions.invoke('reports-csv', { body: { report } });
      if (error) throw error;
      const blob = new Blob([data as string], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${report}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${report} report downloaded.`);
    } catch (e) {
      toast.error(`Report failed: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }
  return (
    <div className="space-y-4">
      <PageHeader title="Finance reports" description="Exports carry the same filters you see on screen. Files download immediately." />
      <ReportsSubnav items={[{ label: 'Finance', href: '/finance/reports' }, { label: 'School', href: '/admin/reports' }]} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-4">
            <p className="font-medium">{r.label}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{r.hint}</p>
            <LoadingButton loading={running === r.id} variant="outline" size="sm" className="mt-3" onClick={() => csv(r.id)}>Download CSV</LoadingButton>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Aged {dateKE(new Date().toISOString())} · Africa/Nairobi</p>
    </div>
  );
}
