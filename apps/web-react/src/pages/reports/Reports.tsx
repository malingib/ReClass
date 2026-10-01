import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { dateKE, fullName, isSchoolPayment, moneyKES } from '@/lib/format';
import { exportCSV } from '@/lib/export';

/* ── Shared live-data helpers ─────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(iso: string): string | null {
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type StudentLite = { id: string; first_name?: string | null; last_name?: string | null; grade?: string | null; admission_no?: string | null; created_at?: string | null };

function ReportShell({ title, description, action, loading, error, empty, emptyTitle, emptyDescription, children }: {
  title: string; description: string; action?: React.ReactNode; loading: boolean; error: boolean;
  empty: boolean; emptyTitle: string; emptyDescription: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} action={action} />
      {loading ? <TableSkeleton rows={6} /> : error ? (
        <EmptyState title={`Unable to load ${title.toLowerCase()}`} description="Check your connection and try again." />
      ) : empty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : children}
    </div>
  );
}


// ──────────────────────────── FEE COLLECTION REPORT ────────────────────────────

export function FeeCollectionReport() {
  const payments = useQuery({
    queryKey: ['report-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount,status,created_at,domain')
        .eq('status', 'paid')
        .order('created_at', { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as { amount: number; status: string; created_at: string; domain?: string | null }[];
    },
  });
  const invoices = useQuery({
    queryKey: ['report-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('amount_due,amount_paid,status,student:students(grade)')
        .is('deleted_at', null)
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as { amount_due: number; amount_paid: number; status: string; student: { grade?: string | null } | { grade?: string | null }[] | null }[];
    },
  });

  // School-fee money only — remedial flows through its own programme accounts.
  const schoolPayments = (payments.data ?? []).filter((p) => isSchoolPayment(p.domain));
  const monthly = new Map<string, number>();
  for (const p of schoolPayments) {
    const label = monthLabel(p.created_at);
    if (!label) continue;
    monthly.set(label, (monthly.get(label) ?? 0) + Number(p.amount || 0));
  }
  const trend = [...monthly.entries()].slice(-8).map(([month, collected]) => ({ month, collected }));

  const invRows = invoices.data ?? [];
  const totalCollected = schoolPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOutstanding = invRows.reduce((s, i) => s + Math.max(0, Number(i.amount_due || 0) - Number(i.amount_paid || 0)), 0);

  const perGrade = new Map<string, { paid: number; due: number }>();
  for (const inv of invRows) {
    const pick = Array.isArray(inv.student) ? inv.student[0] : inv.student;
    const grade = pick?.grade ?? 'Ungraded';
    const e = perGrade.get(grade) ?? { paid: 0, due: 0 };
    e.paid += Number(inv.amount_paid || 0);
    e.due += Math.max(0, Number(inv.amount_due || 0) - Number(inv.amount_paid || 0));
    perGrade.set(grade, e);
  }
  const collectionRows: (string | number)[][] = [...perGrade.entries()].map(([grade, e]) => [grade, moneyKES(e.paid), moneyKES(e.due)]);

  const loading = payments.isLoading || invoices.isLoading;
  const isError = payments.isError || invoices.isError;
  const empty = !loading && !isError && schoolPayments.length === 0 && invRows.length === 0;

  return (
    <ReportShell title="Fee collection report" description="School-fee collection summaries and outstanding analysis, computed from live invoices and payments."
      action={<Button size="sm" variant="outline" disabled={collectionRows.length === 0} onClick={() => { exportCSV('fee-collection-report', ['Class', 'Collected', 'Outstanding'], collectionRows); toast.success('Fee collection report exported as CSV.'); }}>Export CSV</Button>}
      loading={loading} error={isError} empty={empty}
      emptyTitle="No fee data yet" emptyDescription="Collection analysis will appear here once invoices and payments exist.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total collected</p><p className="mt-1 text-2xl font-semibold text-success tabular-nums">{moneyKES(totalCollected)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total outstanding</p><p className="mt-1 text-2xl font-semibold text-destructive tabular-nums">{moneyKES(totalOutstanding)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly collection trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
              <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Class-wise collection</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable columns={['Class', 'Collected', 'Outstanding']} rows={collectionRows} empty="No collection data." />
        </CardContent>
      </Card>
    </ReportShell>
  );
}

// ──────────────────────────── TEACHER PERFORMANCE ────────────────────────────

export function TeacherPerformance() {
  const teachers = useQuery({
    queryKey: ['report-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id,first_name,last_name')
        .is('deleted_at', null)
        .limit(200);
      if (error) throw error;
      return (data ?? []) as { id: string; first_name?: string | null; last_name?: string | null }[];
    },
  });
  const attendance = useQuery({
    queryKey: ['report-teacher-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('teacher_id,status')
        .is('deleted_at', null)
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as { teacher_id: string; status: string }[];
    },
  });
  const occurrences = useQuery({
    queryKey: ['report-occurrences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_occurrences')
        .select('teacher_id,class')
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as { teacher_id: string; class?: string | null }[];
    },
  });

  const attByTeacher = new Map<string, { present: number; total: number }>();
  for (const m of attendance.data ?? []) {
    const e = attByTeacher.get(m.teacher_id) ?? { present: 0, total: 0 };
    e.total += 1;
    if (m.status === 'present' || m.status === 'late') e.present += 1;
    attByTeacher.set(m.teacher_id, e);
  }
  const occByTeacher = new Map<string, Set<string>>();
  const sessByTeacher = new Map<string, number>();
  for (const o of occurrences.data ?? []) {
    if (!occByTeacher.has(o.teacher_id)) occByTeacher.set(o.teacher_id, new Set());
    if (o.class) occByTeacher.get(o.teacher_id)!.add(o.class);
    sessByTeacher.set(o.teacher_id, (sessByTeacher.get(o.teacher_id) ?? 0) + 1);
  }
  const teacherRows: (string | number)[][] = (teachers.data ?? []).map((t) => {
    const att = attByTeacher.get(t.id);
    const rate = att && att.total > 0 ? `${Math.round((att.present / att.total) * 1000) / 10}%` : 'No data';
    return [fullName(t.first_name, t.last_name), occByTeacher.get(t.id)?.size ?? 0, sessByTeacher.get(t.id) ?? 0, rate];
  });

  const loading = teachers.isLoading || attendance.isLoading || occurrences.isLoading;
  const isError = teachers.isError || attendance.isError || occurrences.isError;

  return (
    <ReportShell title="Teacher performance" description="Teaching load and attendance record per teacher, computed from live sessions and attendance marks."
      action={<Button size="sm" variant="outline" disabled={teacherRows.length === 0} onClick={() => { exportCSV('teacher-performance', ['Teacher', 'Classes', 'Sessions', 'Attendance Rate'], teacherRows); toast.success('Teacher performance exported as CSV.'); }}>Export CSV</Button>}
      loading={loading} error={isError} empty={!loading && !isError && (teachers.data ?? []).length === 0}
      emptyTitle="No teacher data" emptyDescription="Teacher performance will appear here once teachers and sessions exist.">
      <Card>
        <CardContent className="p-0">
          <DataTable columns={['Teacher', 'Classes', 'Sessions', 'Attendance Rate']} rows={teacherRows} empty="No teacher data." />
        </CardContent>
      </Card>
    </ReportShell>
  );
}

// ──────────────────────────── CUSTOM REPORTS ────────────────────────────

const REPORT_TYPES = [
  { id: 'fees', label: 'Fee collection', hint: 'Payment and invoice data' },
  { id: 'enrollment', label: 'Enrollment', hint: 'Student enrollment data' },
];

export function CustomReports() {
  const [reportType, setReportType] = useState('fees');
  const [classFilter, setClassFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [columns, setColumns] = useState(['name', 'class', 'date', 'status']);
  const [exporting, setExporting] = useState(false);

  const fees = useQuery({
    queryKey: ['custom-fees', classFilter, dateFrom, dateTo],
    enabled: reportType === 'fees',
    queryFn: async () => {
      let q = supabase.from('invoices').select('amount_due,amount_paid,status,created_at,student:students(first_name,last_name,grade,admission_no)').is('deleted_at', null).order('created_at', { ascending: false }).limit(200);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      const pick = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
      return ((data ?? []) as unknown as {
        amount_due: number; amount_paid: number; status: string; created_at?: string | null;
        student: { first_name?: string | null; last_name?: string | null; grade?: string | null; admission_no?: string | null } | { first_name?: string | null; last_name?: string | null; grade?: string | null; admission_no?: string | null }[] | null;
      }[]).filter((r) => !classFilter || (pick(r.student)?.grade ?? '') === classFilter).map((r) => {
        const s = pick(r.student);
        return {
          name: fullName(s?.first_name, s?.last_name), class: s?.grade ?? '—', admission_no: s?.admission_no ?? '—',
          date: dateKE(r.created_at), status: r.status, marks: '—', grade: '—',
          fee_balance: moneyKES(Math.max(0, Number(r.amount_due || 0) - Number(r.amount_paid || 0))),
        } as Record<string, string>;
      });
    },
  });

  const enrollment = useQuery({
    queryKey: ['custom-enrollment', classFilter, dateFrom, dateTo],
    enabled: reportType === 'enrollment',
    queryFn: async () => {
      let q = supabase.from('students').select('id,first_name,last_name,grade,admission_no,status,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(200);
      if (classFilter) q = q.eq('grade', classFilter);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as StudentLite[]).map((s) => ({
        name: fullName(s.first_name, s.last_name), class: s.grade ?? '—', admission_no: s.admission_no ?? '—',
        date: dateKE(s.created_at), status: 'enrolled', marks: '—', grade: '—', fee_balance: '—',
      }) as Record<string, string>);
    },
  });

  const active = reportType === 'fees' ? fees : enrollment;
  const preview = (active.data ?? []).slice(0, 8).map((r) => columns.map((c) => r[c] ?? '—'));

  function handleExportCsv() {
    if (columns.length === 0) {
      toast.error('Select at least one column to export.');
      return;
    }
    const rows = (active.data ?? []).map((r) => columns.map((c) => r[c] ?? '—'));
    if (rows.length === 0) {
      toast.error('No rows match the current filters.');
      return;
    }
    setExporting(true);
    try {
      exportCSV(`custom-report-${reportType}`, columns, rows);
      toast.success('Report exported as CSV.');
    } finally {
      setExporting(false);
    }
  }

  function handleExportPdf() {
    if (columns.length === 0) {
      toast.error('Select at least one column to export.');
      return;
    }
    setExporting(true);
    try {
      window.print();
      toast.success('Use the print dialog to save as PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Custom reports" description="Build custom reports with filters and column selection, exported from live records." />
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader><CardTitle>Report builder</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Report type">
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {REPORT_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Class filter">
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All classes</option>
                <option>Form 1A</option><option>Form 1B</option><option>Form 2A</option><option>Form 2B</option><option>Form 3A</option><option>Form 3B</option>
              </select>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="From"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
            </div>
            <Field label="Columns" hint="Selected fields to include in the report.">
              <div className="flex flex-wrap gap-2">
                {['name', 'class', 'admission_no', 'date', 'status', 'marks', 'grade', 'fee_balance'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColumns((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col])}
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer',
                      columns.includes(col)
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {col.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Report preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Report type: <strong>{REPORT_TYPES.find((r) => r.id === reportType)?.label}</strong>
              {classFilter && <span> · Class: <strong>{classFilter}</strong></span>}
              {dateFrom && <span> · From: <strong>{dateKE(dateFrom)}</strong></span>}
              {dateTo && <span> · To: <strong>{dateKE(dateTo)}</strong></span>}
            </p>
            {active.isLoading ? <TableSkeleton rows={4} /> : active.isError ? (
              <EmptyState title="Unable to load preview" description="Check your connection and try again." />
            ) : (active.data ?? []).length === 0 ? (
              <EmptyState title="No matching records" description="Adjust the filters to find records." />
            ) : (
              <DataTable columns={columns.map((c) => c.replace(/_/g, ' '))} rows={preview} empty="No matching records." pagination="none" />
            )}
            <p className="text-sm text-muted-foreground">Columns: {columns.length === 0 ? 'none selected' : columns.map((c) => c.replace(/_/g, ' ')).join(', ')}</p>
            <div className="flex flex-wrap gap-2">
              <LoadingButton loading={exporting} disabled={columns.length === 0} onClick={handleExportCsv}>Export CSV</LoadingButton>
              <Button variant="outline" disabled={exporting || columns.length === 0} onClick={handleExportPdf}>Export PDF</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
