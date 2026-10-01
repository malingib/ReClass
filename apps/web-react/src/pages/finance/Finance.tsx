import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeeCollection, useFinancialReport, useInvoices, useReceipts, useUnmatchedPayments } from '@/hooks/useFinance';
import { useSchool } from '@/hooks/useSchool';
import { DataTable } from '@/components/DataTable';
import { FeeManager } from '@/components/FeeManager';
import { PayrollPanel } from '@/components/PayrollPanel';
import { Modal, ReceiptModal } from '@/components/ReceiptModal';
import { PaymentList, type PaymentItem } from '@/components/PaymentList';
import { ProgressCard } from '@/components/ProgressCard';
import { ResponsiveGrid } from '@/components/ResponsiveGrid';
import { KpiCard } from '@/components/KpiCard';
import { CashflowChart, DateRangeFilter, ReportsSubnav, TrendAreaChart, type MonthlySeries, type ReportDateRange } from '@/components/reports';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Field, Input, LoadingButton, PageHeader, Skeleton, StatusPill, TableSkeleton } from '@/components/ui';
import { dateKE, datetimeKE, fullName, moneyKES, paymentDomainLabel, phoneDisplay } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle,
  Banknote, Building2, Globe,
  Download, Printer, Send, PieChart as PieChartIcon,
} from 'lucide-react';

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

/* Shared helpers: CSV download, money guards, method normalization, storage. */

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** Guarded number: non-finite input becomes 0 so money math never shows NaN. */
function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Normalize payment-method labels so 'M-Pesa', 'm-pesa' and 'mpesa' all match. */
function normMethod(v: unknown): string {
  return String(v ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable — state still works for this session */
  }
}

/* ================================================================
   FinanceOverview
   ================================================================ */

function FinanceOverviewCharts() {
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
      agg.amount += num(r.amount);
      agg.count += 1;
      map.set(monthKey(d), agg);
    }
    return [...map.entries()].sort().map(([key, v]) => ({ month: monthLabel(key), amount: v.amount, count: v.count }));
  }, [receipts, range]);

  const totalDue = collection?.totalDue ?? 0;
  const totalPaid = collection?.totalPaid ?? 0;

  return (
    <div className="space-y-4">
      <DateRangeFilter onApply={setRange} />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendAreaChart data={series} title="Collection trend" description={`Paid receipts per month`} />
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
  const { data, isLoading: invoicesLoading } = useInvoices(1, 20);
  const { data: collection, isLoading: collectionLoading } = useFeeCollection();
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('expenses')
        .select('id,amount,incurred_at')
        .is('deleted_at', null)
        .order('incurred_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (rows ?? []) as { id: string; amount: number; incurred_at?: string | null }[];
    },
  });
  const rows = data?.rows ?? [];

  const totalRevenue = num(collection?.totalPaid);
  const totalDue = num(collection?.totalDue);
  const outstandingFees = Math.max(0, totalDue - totalRevenue);
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + num(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const loading = invoicesLoading || collectionLoading || expensesLoading;

  const revenueExpensesData = useMemo(() => {
    const buckets = new Map<string, { revenue: number; expenses: number }>();
    for (const r of rows) {
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = monthKey(d);
      const b = buckets.get(key) ?? { revenue: 0, expenses: 0 };
      b.revenue += num(r.amount_paid);
      buckets.set(key, b);
    }
    for (const e of expenses ?? []) {
      if (!e.incurred_at) continue;
      const d = new Date(e.incurred_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = monthKey(d);
      const b = buckets.get(key) ?? { revenue: 0, expenses: 0 };
      b.expenses += num(e.amount);
      buckets.set(key, b);
    }
    return [...buckets.entries()].sort().slice(-6).map(([key, v]) => ({ name: monthLabel(key), revenue: v.revenue, expenses: v.expenses }));
  }, [rows, expenses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Finance Overview" description="School-wide financial summary and analytics" />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Total Revenue" value={moneyKES(totalRevenue)} icon={TrendingUp} description="Total collected this term" />
          <KpiCard title="Total Expenses" value={moneyKES(totalExpenses)} icon={TrendingDown} description="Live total from expenses table" />
          <KpiCard title="Net Position" value={moneyKES(netProfit)} icon={DollarSign} description="Revenue minus live expenses" />
          <KpiCard title="Outstanding Fees" value={moneyKES(outstandingFees)} icon={AlertCircle} description="Pending collections" />
        </div>
      )}

      <FinanceOverviewCharts />

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
          <p className="text-xs text-muted-foreground">Derived from live invoices and expenses by month</p>
        </CardHeader>
        <CardContent>
          {revenueExpensesData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No dated transactions yet — the chart fills in once invoices and expenses exist.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueExpensesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => moneyKES(v)} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {rows.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{fullName(r.student?.first_name, r.student?.last_name)}</p>
                      <p className="text-xs text-muted-foreground">{r.student?.admission_no ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{moneyKES(r.amount_paid)}</p>
                      <StatusPill status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fee Collection Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invoices</span>
                <span className="font-medium">{data?.total ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Collected</span>
                <span className="font-medium">{moneyKES(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-medium text-destructive">{moneyKES(outstandingFees)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${totalDue > 0 ? (totalRevenue / totalDue) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {totalDue > 0 ? `${((totalRevenue / totalDue) * 100).toFixed(1)}%` : '0%'} collection rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================
   Fees
   ================================================================ */

export function Fees() {
  const { data: collection, isLoading } = useFeeCollection();
  const totalDue = collection?.totalDue ?? 0;
  const totalPaid = collection?.totalPaid ?? 0;
  const pct = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Fee Types" description="Define what the school charges. Invoices are generated from these." />
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

/* ================================================================
   PaymentDefinitions
   ================================================================ */

type PaymentDef = {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  description: string;
};

const PAYMENT_METHOD_DEFAULTS: PaymentDef[] = [
  { id: '1', name: 'M-Pesa Paybill', method: 'mpesa', enabled: true, description: 'Lipa na M-Pesa Paybill via Safaricom Daraja API' },
  { id: '2', name: 'M-Pesa Till', method: 'mpesa', enabled: false, description: 'Lipa na M-Pesa Paybill via Till Number' },
  { id: '3', name: 'Bank Transfer', method: 'bank', enabled: true, description: 'Direct KCB bank deposit with reference matching' },
  { id: '4', name: 'Cash Payment', method: 'cash', enabled: true, description: 'In-person cash collection at finance office' },
  { id: '5', name: 'Card Payment', method: 'card', enabled: false, description: 'Visa/Mastercard via payment gateway' },
];

const PAYMENT_DEF_ICON_TONE: Record<string, string> = {
  mpesa: 'text-success-foreground',
  bank: 'text-info-foreground',
  cash: 'text-warning-foreground',
  card: 'text-muted-foreground',
};

export function PaymentDefinitions() {
  const [defs, setDefs] = useState<PaymentDef[]>(() => {
    const saved = loadJSON<Record<string, boolean>>('reclass:payment-defs', {});
    return PAYMENT_METHOD_DEFAULTS.map((d) => (d.id in saved ? { ...d, enabled: saved[d.id] } : d));
  });

  function toggle(id: string) {
    setDefs((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d));
      const map: Record<string, boolean> = {};
      for (const d of next) map[d.id] = d.enabled;
      saveJSON('reclass:payment-defs', map);
      const changed = next.find((d) => d.id === id);
      toast.success(changed?.enabled ? `${changed?.name} enabled` : `${changed?.name} disabled`);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Payment Definitions" description="Configure how each fee type is collected — M-Pesa, bank transfer, or cash. Toggles are saved in this browser." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {defs.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {d.method === 'mpesa' ? <Globe className={`h-4 w-4 ${PAYMENT_DEF_ICON_TONE.mpesa}`} /> : d.method === 'bank' ? <Building2 className={`h-4 w-4 ${PAYMENT_DEF_ICON_TONE.bank}`} /> : <Banknote className={`h-4 w-4 ${PAYMENT_DEF_ICON_TONE[d.method] ?? PAYMENT_DEF_ICON_TONE.card}`} />}
                    <p className="text-sm font-medium">{d.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={d.enabled}
                  aria-label={`${d.name} ${d.enabled ? 'active' : 'disabled'}`}
                  onClick={() => toggle(d.id)}
                  className="shrink-0"
                >
                  <Badge variant={d.enabled ? 'success' : 'outline'}>{d.enabled ? 'Active' : 'Disabled'}</Badge>
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   SchoolPayroll
   ================================================================ */

export function SchoolPayroll() {
  return (
    <div className="space-y-4">
      <PageHeader title="School Payroll" description="Teacher compensation runs. Generate, approve, then mark paid." />
      <PayrollPanel kind="school" />
    </div>
  );
}

/* ================================================================
   RemedialPayroll
   ================================================================ */

export function RemedialPayroll() {
  return (
    <div className="space-y-4">
      <PageHeader title="Remedial Payroll" description="ReClass teaching and committee compensation. Separation of duties applies." />
      <PayrollPanel kind="remedial" />
    </div>
  );
}

/* ================================================================
   Receipts
   ================================================================ */

export function Receipts() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useReceipts(page, pageSize);
  const { data: school } = useSchool();
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDomain, setFilterDomain] = useState<'all' | 'School' | 'Remedial'>('all');
  const rows = data?.rows ?? [];

  const filtered = rows.filter((r) =>
    (filterStatus === 'all' || String(r.status ?? '').toLowerCase() === filterStatus)
    && (filterDomain === 'all' || paymentDomainLabel(r.domain) === filterDomain),
  );

  const paymentItems: PaymentItem[] = filtered.map((r) => ({
    id: r.id,
    title: r.receipt_no ? `Receipt ${r.receipt_no}` : 'Receipt',
    description: `${fullName(r.student?.first_name, r.student?.last_name)}${r.student?.admission_no ? ` · ${r.student.admission_no}` : ''} · ${paymentDomainLabel(r.domain)}`,
    amount: Number(r.amount ?? 0),
    direction: 'in' as const,
    kind: 'fee' as const,
    date: r.created_at ?? '',
    reference: r.receipt_no ?? undefined,
    status: r.status,
    actor: fullName(r.student?.first_name, r.student?.last_name),
  }));

  function handlePrint(receipt: Record<string, unknown>) {
    setOpen(receipt);
    window.setTimeout(() => window.print(), 150);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Receipts" description="Evidence of actual successful payments — school fees and remedial fees logged separately by domain. Receipts are never edited — errors are corrected with reversals." />
      <div className="flex gap-2 flex-wrap">
        {['all', 'paid', 'pending', 'failed'].map((s) => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => { setFilterStatus(s); setPage(1); }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <span className="mx-1 self-center text-xs text-muted-foreground">·</span>
        {(['all', 'School', 'Remedial'] as const).map((d) => (
          <Button key={d} variant={filterDomain === d ? 'default' : 'outline'} size="sm" onClick={() => { setFilterDomain(d); setPage(1); }}>
            {d === 'all' ? 'All Types' : d}
          </Button>
        ))}
      </div>
      {isLoading ? <TableSkeleton /> : (
        <>
          <div className="md:hidden">
            <PaymentList items={paymentItems} empty="No receipts yet. Receipts appear automatically when M-Pesa payments complete." />
          </div>
          <div className="hidden md:block">
            <DataTable
              columns={['Receipt', 'Student', 'Amount', 'Type', 'Date', 'Status', '']}
              rows={filtered.map((r) => [
                r.receipt_no ?? '—',
                fullName(r.student?.first_name, r.student?.last_name),
                moneyKES(r.amount),
                <Badge key={`d-${r.id}`} variant={paymentDomainLabel(r.domain) === 'Remedial' ? 'secondary' : 'outline'}>{paymentDomainLabel(r.domain)}</Badge>,
                datetimeKE(r.created_at),
                <StatusPill key={`s-${r.id}`} status={r.status} />,
                <div key={`a-${r.id}`} className="flex gap-1">
                  <Button key={`v-${r.id}`} variant="outline" size="sm" onClick={() => setOpen(r as unknown as Record<string, unknown>)}>View</Button>
                  <Button key={`p-${r.id}`} variant="ghost" size="sm" onClick={() => handlePrint(r as unknown as Record<string, unknown>)}><Printer className="h-3 w-3" /></Button>
                </div>,
              ])}
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

/* ================================================================
   UnmatchedPayments
   ================================================================ */

export function UnmatchedPayments() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useUnmatchedPayments();
  const { data: invoices } = useInvoices(1, 50);
  const [acked, setAcked] = useState<string[]>(() => loadJSON<string[]>('reclass:unmatched-ack', []));
  const ackedSet = useMemo(() => new Set(acked), [acked]);

  const open = useMemo(
    () => rows.filter((r) => (r as Record<string, unknown>).matched_at == null),
    [rows],
  );

  function acknowledge(id: string) {
    setAcked((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveJSON('reclass:unmatched-ack', next);
      return next;
    });
    toast.success('Payment acknowledged — recorded in this browser');
  }

  async function matchToInvoice(unmatchedId: string, invoiceId: string) {
    if (!invoiceId) {
      toast.error('Choose an invoice to match against');
      return;
    }
    try {
      const { error } = await supabase
        .from('unmatched_payments')
        .update({ matched_to: invoiceId, matched_at: new Date().toISOString() })
        .eq('id', unmatchedId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['unmatched'] });
      toast.success('Payment matched to invoice');
    } catch (e) {
      toast.error(`Match failed: ${(e as Error).message}`);
    }
  }

  const items: PaymentItem[] = open.map((r, i) => {
    const rec = r as Record<string, unknown>;
    const id = String(rec.id ?? `unmatched-${i}`);
    const ref = typeof rec.mpesa_receipt === 'string' && rec.mpesa_receipt
      ? rec.mpesa_receipt
      : typeof rec.checkout_id === 'string' ? rec.checkout_id : undefined;
    return {
      id,
      title: typeof rec.bill_ref === 'string' && rec.bill_ref ? `Unmatched · ${rec.bill_ref}` : `Unmatched payment ${moneyKES(rec.amount)}`,
      description: phoneDisplay(rec.phone),
      amount: num(rec.amount),
      direction: 'in' as const,
      kind: 'other' as const,
      date: String(rec.created_at ?? ''),
      reference: ref,
      status: ackedSet.has(id) ? 'acknowledged' : 'unmatched',
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Unmatched Payments" description="Money that arrived without a matching bill — resolve each row against the M-Pesa statement." />
      <PaymentList
        items={items}
        loading={isLoading}
        empty="Queue clear. Every shilling is matched."
        renderAction={(item) => (
          <UnmatchResolve
            itemId={item.id}
            acknowledged={ackedSet.has(item.id)}
            invoices={(invoices?.rows ?? []).map((inv) => ({
              id: inv.id,
              label: `${fullName(inv.student?.first_name, inv.student?.last_name)} · ${moneyKES(num(inv.amount_due) - num(inv.amount_paid))} bal`,
            }))}
            onMatch={(invoiceId) => matchToInvoice(item.id, invoiceId)}
            onAck={() => acknowledge(item.id)}
          />
        )}
      />
    </div>
  );
}

function UnmatchResolve({ itemId, acknowledged, invoices, onMatch, onAck }: {
  itemId: string;
  acknowledged: boolean;
  invoices: { id: string; label: string }[];
  onMatch: (invoiceId: string) => void;
  onAck: () => void;
}) {
  const [invoiceId, setInvoiceId] = useState('');
  const [matching, setMatching] = useState(false);

  async function handleMatch() {
    setMatching(true);
    try {
      await onMatch(invoiceId);
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <select
        aria-label={`Match payment ${itemId} to invoice`}
        value={invoiceId}
        onChange={(e) => setInvoiceId(e.target.value)}
        className="h-8 max-w-[220px] rounded-md border bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Match to invoice…</option>
        {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.label}</option>)}
      </select>
      <div className="flex gap-1">
        <LoadingButton loading={matching} size="sm" variant="outline" onClick={handleMatch} disabled={!invoiceId}>Match</LoadingButton>
        <Button size="sm" variant="ghost" onClick={onAck} disabled={acknowledged}>
          {acknowledged ? 'Noted' : 'Acknowledge'}
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   FinanceReports
   ================================================================ */

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
      <PageHeader title="Finance Reports" description="Per-report CSV exports generated on demand. Files download immediately." />
      <ReportsSubnav items={[{ label: 'Finance', href: '/finance/reports' }, { label: 'School', href: '/admin/reports' }]} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <p className="font-medium">{r.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{r.hint}</p>
              <LoadingButton loading={running === r.id} variant="outline" size="sm" className="mt-3" onClick={() => csv(r.id)}>Download CSV</LoadingButton>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Aged {dateKE(new Date().toISOString())} · Africa/Nairobi</p>
    </div>
  );
}

/* ================================================================
   Invoices
   ================================================================ */

type InvoiceRecord = {
  id: string;
  student_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  created_at: string;
  due_date?: string | null;
  student?: { first_name?: string | null; last_name?: string | null; admission_no?: string | null } | null;
};


export function Invoices() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useInvoices(page, pageSize);
  const liveRows: InvoiceRecord[] = (data?.rows ?? []).map((r) => ({
    id: r.id,
    student_id: r.student_id,
    amount_due: num(r.amount_due),
    amount_paid: num(r.amount_paid),
    status: r.status,
    created_at: r.created_at ?? '',
    due_date: (r as unknown as { due_date?: string | null }).due_date ?? null,
    student: r.student ?? null,
  }));

  const filtered = liveRows.filter((inv) => {
    const matchStatus = statusFilter === 'all' || String(inv.status ?? '').toLowerCase() === statusFilter;
    const matchSearch = !searchTerm || `${inv.student?.first_name} ${inv.student?.last_name} ${inv.student?.admission_no}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  function exportFilteredCsv() {
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Student', 'Admission No', 'Amount Due', 'Amount Paid', 'Balance', 'Status', 'Created'],
      filtered.map((inv) => [
        fullName(inv.student?.first_name, inv.student?.last_name),
        inv.student?.admission_no ?? '',
        num(inv.amount_due).toFixed(2),
        num(inv.amount_paid).toFixed(2),
        (num(inv.amount_due) - num(inv.amount_paid)).toFixed(2),
        inv.status,
        inv.created_at,
      ]),
    );
    toast.success(`Exported ${filtered.length} invoice${filtered.length === 1 ? '' : 's'} to CSV`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Manage student invoices and billing"
        action={(
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportFilteredCsv} disabled={filtered.length === 0}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
            <Button onClick={() => setShowCreate(true)}>Create Invoice</Button>
          </div>
        )}
      />
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search student..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="max-w-xs" />
        {['all', 'paid', 'partial', 'overdue', 'pending'].map((s) => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => { setStatusFilter(s); setPage(1); }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      {isLoading ? <TableSkeleton /> : (
        <>
          <DataTable
            columns={['Student', 'Admission No', 'Amount Due', 'Amount Paid', 'Balance', 'Status', 'Created', '']}
            rows={filtered.map((inv) => {
              const balance = num(inv.amount_due) - num(inv.amount_paid);
              return [
                fullName(inv.student?.first_name, inv.student?.last_name),
                inv.student?.admission_no ?? '—',
                moneyKES(inv.amount_due),
                moneyKES(inv.amount_paid),
                balance < 0 ? `Overpaid ${moneyKES(Math.abs(balance))}` : moneyKES(balance),
                <StatusPill key={inv.id} status={inv.status} />,
                dateKE(inv.created_at),
                <Button key={`d-${inv.id}`} variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)}>View</Button>,
              ];
            })}
            empty="No invoices found."
          />
          <ServerPager page={page} total={data?.total ?? 0} pageSize={pageSize} onPage={setPage} />
        </>
      )}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invoice">
        <InvoiceForm onClose={() => setShowCreate(false)} />
      </Modal>
      <Modal open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Invoice Detail">
        {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
      </Modal>
    </div>
  );
}

function InvoiceForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const due = num(amount);
    if (!studentId.trim()) {
      toast.error('Student ID is required');
      return;
    }
    if (due <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('invoices').insert({
        student_id: studentId.trim(),
        amount_due: due,
        amount_paid: 0,
        status: 'pending',
        due_date: dueDate || null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['fee-collection'] });
      toast.success('Invoice created');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Student ID" htmlFor="inv-student"><Input id="inv-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required placeholder="Student UUID" /></Field>
      <Field label="Amount Due (KES)" htmlFor="inv-amount"><Input id="inv-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" inputMode="decimal" /></Field>
      <Field label="Due Date" htmlFor="inv-due"><Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <LoadingButton loading={submitting}>Create Invoice</LoadingButton>
      </div>
    </form>
  );
}

function InvoiceDetail({ invoice }: { invoice: InvoiceRecord }) {
  const qc = useQueryClient();
  const [reminding, setReminding] = useState(false);
  const due = num(invoice.amount_due);
  const paid = num(invoice.amount_paid);
  const balance = due - paid;
  const overpaid = balance < 0;

  async function sendReminder() {
    setReminding(true);
    try {
      const { error: notifyError } = await supabase.from('notifications').insert({
        channel: 'sms',
        recipient: invoice.student?.admission_no ?? invoice.student_id,
        template: 'fee-reminder',
        body: `Fee reminder for ${fullName(invoice.student?.first_name, invoice.student?.last_name)}: balance ${moneyKES(Math.max(0, balance))} on invoice ${invoice.id}.`,
        status: 'queued',
        related_type: 'invoice',
        related_id: invoice.id,
      });
      if (notifyError) throw notifyError;
      await supabase.from('invoices').update({ last_reminded_at: new Date().toISOString() }).eq('id', invoice.id);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Reminder queued via SMS');
    } catch (err) {
      toast.error(`Reminder not sent: ${(err as Error).message}`);
    } finally {
      setReminding(false);
    }
  }

  function downloadInvoiceCsv() {
    downloadCsv(
      `invoice-${invoice.id.slice(0, 8)}.csv`,
      ['Field', 'Value'],
      [
        ['Student', fullName(invoice.student?.first_name, invoice.student?.last_name)],
        ['Admission No', invoice.student?.admission_no ?? ''],
        ['Amount Due', due.toFixed(2)],
        ['Amount Paid', paid.toFixed(2)],
        ['Balance', overpaid ? `Overpaid ${Math.abs(balance).toFixed(2)}` : balance.toFixed(2)],
        ['Status', invoice.status],
        ['Due Date', invoice.due_date ?? ''],
        ['Created', invoice.created_at],
      ],
    );
    toast.success('Invoice downloaded as CSV');
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{fullName(invoice.student?.first_name, invoice.student?.last_name)}</span></div>
        <div><span className="text-muted-foreground">Admission:</span> <span className="font-medium">{invoice.student?.admission_no ?? '—'}</span></div>
        <div><span className="text-muted-foreground">Amount Due:</span> <span className="font-medium">{moneyKES(due)}</span></div>
        <div><span className="text-muted-foreground">Amount Paid:</span> <span className="font-medium">{moneyKES(paid)}</span></div>
        <div><span className="text-muted-foreground">Balance:</span> <span className="font-medium text-destructive">{overpaid ? `Overpaid ${moneyKES(Math.abs(balance))}` : moneyKES(balance)}</span></div>
        <div><span className="text-muted-foreground">Status:</span> <StatusPill status={overpaid ? 'overpaid' : invoice.status} /></div>
      </div>
      <div className="flex gap-2">
        <LoadingButton variant="outline" size="sm" loading={reminding} onClick={sendReminder}><Send className="h-3 w-3 mr-1" /> Send Reminder</LoadingButton>
        <Button variant="outline" size="sm" onClick={downloadInvoiceCsv}><Download className="h-3 w-3 mr-1" /> Download</Button>
      </div>
    </div>
  );
}

/* ================================================================
   Expenses — live rows from the `expenses` table
   (id, category, description, amount, incurred_at).
   ================================================================ */

const EXPENSE_CATEGORIES = ['Utilities', 'Supplies', 'Maintenance', 'Transport', 'Salaries', 'IT', 'Marketing', 'Other'];

type LiveExpense = { id: string; category?: string | null; description?: string | null; amount?: number | null; incurred_at?: string | null };

function useLiveExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id,category,description,amount,incurred_at')
        .is('deleted_at', null)
        .order('incurred_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return ((data ?? []) as LiveExpense[]).map((e) => ({
        id: String(e.id),
        category: e.category ?? 'Other',
        description: e.description ?? '',
        amount: num(e.amount),
        date: e.incurred_at ?? '',
      }));
    },
  });
}

export function Expenses() {
  const [showAdd, setShowAdd] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: live = [], isLoading, isError } = useLiveExpenses();
  const filtered = live.filter((e) => categoryFilter === 'all' || normMethod(e.category) === normMethod(categoryFilter));

  const totalExpenses = filtered.reduce((s, e) => s + num(e.amount), 0);
  const distinctCats = new Set(live.map((e) => normMethod(e.category))).size;
  const monthStart = new Date().toISOString().slice(0, 7);
  const thisMonth = live.filter((e) => e.date.startsWith(monthStart)).reduce((s, e) => s + num(e.amount), 0);

  const monthlyData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of live) {
      if (!e.date) continue;
      const key = e.date.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + num(e.amount));
    }
    return [...buckets.entries()].sort().slice(-6).map(([key, amount]) => ({ month: monthLabel(key), amount }));
  }, [live]);

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" description="Track and manage school expenses — live rows from the expenses table" action={<Button onClick={() => setShowAdd(true)}>Add Expense</Button>} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Total Expenses" value={moneyKES(totalExpenses)} icon={TrendingDown} description="This filter scope" />
          <KpiCard title="This Month" value={moneyKES(thisMonth)} icon={AlertCircle} description="Incurred this calendar month" />
          <KpiCard title="Categories" value={String(distinctCats)} icon={PieChartIcon} description="Distinct categories in scope" />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Monthly Expenses</CardTitle><p className="text-xs text-muted-foreground">Derived from the same live scope as the KPIs</p></CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{isError ? 'Could not load expenses.' : 'No expenses recorded yet.'}</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => moneyKES(v)} />
                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('all')}>All</Button>
        {EXPENSE_CATEGORIES.map((c) => (
          <Button key={c} variant={categoryFilter === c ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter(c)}>{c}</Button>
        ))}
      </div>

      <DataTable
        columns={['Date', 'Category', 'Description', 'Amount']}
        rows={filtered.map((e) => [
          e.date ? dateKE(e.date) : '—',
          <Badge key={`c-${e.id}`} variant="secondary">{e.category}</Badge>,
          e.description || '—',
          moneyKES(e.amount),
        ])}
        empty="No expenses recorded."
      />
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
        <ExpenseForm onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [method, setMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = num(amount);
    if (value <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        category: category || 'Other',
        description: method === 'cash' ? description : `${description} [via ${method}]`,
        amount: value,
        incurred_at: date || new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense recorded');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Category" htmlFor="exp-cat">
        <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value)} required className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Select category</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Description" htmlFor="exp-desc"><Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} required /></Field>
      <Field label="Amount (KES)" htmlFor="exp-amt"><Input id="exp-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" inputMode="decimal" /></Field>
      <Field label="Date" htmlFor="exp-date"><Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Payment Method" htmlFor="exp-method">
        <select id="exp-method" value={method} onChange={(e) => setMethod(e.target.value)} className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="bank">Bank Transfer</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <LoadingButton loading={submitting}>Record Expense</LoadingButton>
      </div>
    </form>
  );
}

/* ================================================================
   Income — live rows from the `other_income` table
   (description, amount, category, received_at, notes).
   ================================================================ */

export function Income() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: live = [], isLoading } = useQuery({
    queryKey: ['other-income'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('other_income')
        .select('id,description,amount,category,received_at,notes')
        .is('deleted_at', null)
        .order('received_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as { id: string; description?: string | null; amount?: number | null; category?: string | null; received_at?: string | null; notes?: string | null }[])
        .map((r) => ({
          id: String(r.id),
          source: r.description ?? '—',
          amount: num(r.amount),
          date: r.received_at ?? '',
          description: r.notes ?? '',
          category: r.category ?? 'Commercial',
        }));
    },
  });
  const totalIncome = live.reduce((s, i) => s + num(i.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Other Income" description="Income sources outside of student fees — live rows from the other_income table" action={<Button onClick={() => setShowAdd(true)}>Add Income</Button>} />
      <KpiCard title="Total Other Income" value={moneyKES(totalIncome)} icon={DollarSign} description="Live total this scope" className="max-w-sm" />
      {isLoading ? <TableSkeleton /> : (
        <DataTable
          columns={['Date', 'Source', 'Category', 'Description', 'Amount']}
          rows={live.map((i) => [
            i.date ? dateKE(i.date) : '—',
            i.source,
            <Badge key={i.id} variant="secondary">{i.category}</Badge>,
            i.description || '—',
            moneyKES(i.amount),
          ])}
          empty="No other income recorded."
        />
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Income">
        <IncomeForm onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}

function IncomeForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Commercial');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = num(amount);
    if (value <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('other_income').insert({
        description: source,
        amount: value,
        category,
        received_at: date || new Date().toISOString().split('T')[0],
        notes: description || null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['other-income'] });
      toast.success('Income recorded');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Source" htmlFor="inc-src"><Input id="inc-src" value={source} onChange={(e) => setSource(e.target.value)} required placeholder="e.g. Canteen, Rental" /></Field>
      <Field label="Amount (KES)" htmlFor="inc-amt"><Input id="inc-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" inputMode="decimal" /></Field>
      <Field label="Date" htmlFor="inc-date"><Input id="inc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Category" htmlFor="inc-cat">
        <select id="inc-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="Commercial">Commercial</option>
          <option value="Rental">Rental</option>
          <option value="Donation">Donation</option>
          <option value="Academic">Academic</option>
        </select>
      </Field>
      <Field label="Description" htmlFor="inc-desc"><Input id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <LoadingButton loading={submitting}>Record Income</LoadingButton>
      </div>
    </form>
  );
}

/* ================================================================
   PaymentHistory — live rows from `payments` (useReceipts omits the
   method column, so the same table is queried here with method).
   ================================================================ */

export function PaymentHistory() {
  const [methodFilter, setMethodFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState<'all' | 'School' | 'Remedial'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Live rows from the same `payments` table useReceipts reads; method is
  // selected here as well because useReceipts omits it and the M-Pesa filter
  // needs the real label ('M-Pesa', 'm-pesa', 'mpesa' all normalize equal).
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id,amount,method,status,created_at,receipt_no,mpesa_receipt,domain,student:students(first_name,last_name,admission_no)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        amount?: number | null;
        method?: string | null;
        status?: string | null;
        created_at?: string | null;
        receipt_no?: string | null;
        mpesa_receipt?: string | null;
        domain?: string | null;
        student?: { first_name?: string | null; last_name?: string | null; admission_no?: string | null } | null;
      }[];
    },
  });
  const rows = receipts ?? [];

  const filtered = rows.filter((p) => {
    const matchMethod = methodFilter === 'all' || normMethod(p.method) === normMethod(methodFilter);
    const matchDomain = domainFilter === 'all' || paymentDomainLabel(p.domain) === domainFilter;
    const ref = `${p.receipt_no ?? ''} ${p.mpesa_receipt ?? ''}`;
    const matchSearch = !searchTerm
      || fullName(p.student?.first_name, p.student?.last_name).toLowerCase().includes(searchTerm.toLowerCase())
      || ref.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMethod && matchDomain && matchSearch;
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Payment History" description="Complete log of all payments received — school fees and remedial fees logged separately by type" />
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search by student or reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-xs" />
        {['all', 'mpesa', 'bank', 'cash'].map((m) => (
          <Button key={m} variant={methodFilter === m ? 'default' : 'outline'} size="sm" onClick={() => setMethodFilter(m)}>
            {m === 'all' ? 'All Methods' : m.toUpperCase()}
          </Button>
        ))}
        {(['all', 'School', 'Remedial'] as const).map((d) => (
          <Button key={d} variant={domainFilter === d ? 'default' : 'outline'} size="sm" onClick={() => setDomainFilter(d)}>
            {d === 'all' ? 'All Types' : d}
          </Button>
        ))}
      </div>
      {isLoading ? <TableSkeleton /> : (
        <DataTable
          columns={['Date', 'Student', 'Admission', 'Amount', 'Method', 'Type', 'Reference', 'Status']}
          rows={filtered.map((p) => [
            p.created_at ? dateKE(p.created_at) : '—',
            fullName(p.student?.first_name, p.student?.last_name),
            p.student?.admission_no ?? '—',
            moneyKES(p.amount),
            <Badge key={p.id} variant="secondary">{p.method || '—'}</Badge>,
            <Badge key={`d-${p.id}`} variant={paymentDomainLabel(p.domain) === 'Remedial' ? 'secondary' : 'outline'}>{paymentDomainLabel(p.domain)}</Badge>,
            <span key={`ref-${p.id}`} className="font-mono text-xs">{p.mpesa_receipt ?? p.receipt_no ?? '—'}</span>,
            <StatusPill key={`s-${p.id}`} status={p.status ?? '—'} />,
          ])}
          empty="No payment history found."
        />
      )}
    </div>
  );
}

/* ================================================================
   FinancialReports
   ================================================================ */

export function FinancialReports() {
  const [activeReport, setActiveReport] = useState<'pnl' | 'position' | 'cashflow'>('pnl');
  const { data: report, isLoading, isError } = useFinancialReport();

  const pnlRows = useMemo(() => {
    if (!report) return [];
    const rows: { item: string; amount: number }[] = [
      { item: 'Student Fees Income', amount: report.feesCollected },
      { item: 'Other Income', amount: report.otherIncome },
      { item: 'Total Revenue', amount: report.totalRevenue },
      ...report.expensesByCategory.map((c) => ({ item: c.category, amount: -c.amount })),
      { item: 'Total Expenses', amount: -report.totalExpenses },
      { item: 'Net Profit', amount: report.net },
    ];
    return rows;
  }, [report]);

  const cashflowData = useMemo(() => (report?.months ?? []).map((m) => ({
    month: monthLabel(m.key), inflow: m.inflow, outflow: m.outflow, net: m.net,
  })), [report]);

  function exportActiveCsv() {
    if (!report) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (activeReport === 'pnl') {
      downloadCsv(`pnl-statement-${stamp}.csv`, ['Item', 'Amount'],
        pnlRows.map((row) => [row.item, num(row.amount).toFixed(2)]));
      toast.success('P&L statement downloaded as CSV');
    } else if (activeReport === 'position') {
      downloadCsv(`position-${stamp}.csv`, ['Item', 'Amount'], [
        ['Fees collected', num(report.feesCollected).toFixed(2)],
        ['Other income', num(report.otherIncome).toFixed(2)],
        ['Expenses paid', num(report.totalExpenses).toFixed(2)],
        ['Net cash position', num(report.net).toFixed(2)],
        ['Outstanding receivables', num(report.feesOutstanding).toFixed(2)],
      ]);
      toast.success('Position report downloaded as CSV');
    } else {
      downloadCsv(`cashflow-${stamp}.csv`, ['Month', 'Inflow', 'Outflow', 'Net'],
        cashflowData.map((row) => [row.month, num(row.inflow).toFixed(2), num(row.outflow).toFixed(2), num(row.net).toFixed(2)]));
      toast.success('Cash flow report downloaded as CSV');
    }
  }

  const hasData = !!report && (report.paymentCount > 0 || report.expenseCount > 0 || report.feesDue > 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Financial Reports" description="Live statements from invoices, payments, expenses and other income." action={<Badge variant="outline">Live data</Badge>} />
      <div className="flex gap-2">
        <Button variant={activeReport === 'pnl' ? 'default' : 'outline'} size="sm" onClick={() => setActiveReport('pnl')}>P&L Statement</Button>
        <Button variant={activeReport === 'position' ? 'default' : 'outline'} size="sm" onClick={() => setActiveReport('position')}>Position</Button>
        <Button variant={activeReport === 'cashflow' ? 'default' : 'outline'} size="sm" onClick={() => setActiveReport('cashflow')}>Cash Flow</Button>
      </div>

      {isLoading ? <TableSkeleton rows={6} /> : isError ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Could not load financial data.</p>
      ) : !hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No financial records yet — reports fill in once invoices, payments or expenses exist.</p>
      ) : (
        <>
          {activeReport === 'pnl' && (
            <Card>
              <CardHeader><CardTitle>Profit & Loss Statement</CardTitle><p className="text-xs text-muted-foreground">Live · all recorded periods · fees on invoice collections basis</p></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {pnlRows.map((row, i) => (
                    <div key={i} className={`flex justify-between py-2 px-2 text-sm ${row.item.startsWith('Total') || row.item === 'Net Profit' ? 'border-t font-semibold' : ''} ${row.item === 'Net Profit' ? 'bg-muted/50 rounded' : ''}`}>
                      <span>{row.item}</span>
                      <span className={row.amount < 0 ? 'text-destructive' : 'text-success-foreground'}>{moneyKES(Math.abs(num(row.amount)))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeReport === 'position' && report && (
            <Card>
              <CardHeader><CardTitle>Financial Position</CardTitle><p className="text-xs text-muted-foreground">Derived from live tables — not audited statements</p></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {[
                    { name: 'Fees collected', amount: report.feesCollected },
                    { name: 'Other income', amount: report.otherIncome },
                    { name: 'Expenses paid', amount: report.totalExpenses },
                    { name: 'Net cash position', amount: report.net, strong: true },
                    { name: 'Outstanding receivables', amount: report.feesOutstanding },
                  ].map((item) => (
                    <div key={item.name} className={`flex justify-between text-sm py-2 px-2 ${item.strong ? 'border-t font-semibold bg-muted/50 rounded' : ''}`}>
                      <span className={item.strong ? '' : 'text-muted-foreground'}>{item.name}</span>
                      <span className="font-medium">{moneyKES(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeReport === 'cashflow' && (
            <Card>
              <CardHeader><CardTitle>Cash Flow Report</CardTitle><p className="text-xs text-muted-foreground">Receipted payments vs expenses · last 6 months with dated rows</p></CardHeader>
              <CardContent>
                {cashflowData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No dated transactions yet.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cashflowData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => moneyKES(v)} />
                        <Bar dataKey="inflow" fill="#10b981" radius={[4, 4, 0, 0]} name="Inflow" />
                        <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outflow" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {cashflowData.map((row) => (
                        <div key={row.month} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span>{row.month}</span>
                          <span className="text-success-foreground">{moneyKES(row.inflow)}</span>
                          <span className="text-destructive">{moneyKES(row.outflow)}</span>
                          <span className="font-medium">{moneyKES(row.net)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={exportActiveCsv}><Download className="h-3 w-3 mr-1" /> Export to CSV</Button>
        </>
      )}
    </div>
  );
}

