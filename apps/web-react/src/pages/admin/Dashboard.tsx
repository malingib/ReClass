import { useAdminDashboard } from '@/hooks/useDashboard';
import { KpiCard } from '@/components/KpiCard';
import { TrendChart } from '@/components/TrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Users, Wallet, TrendingUp, CalendarCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { data, isLoading, isError } = useAdminDashboard(30);
  if (isLoading || !data) return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">School overview</p><h1 className="mt-1 text-2xl font-semibold">Dashboard</h1></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />)}</div></div>;
  if (isError) return <div className="rounded-md border bg-card p-8 text-sm text-destructive">Unable to load the school dashboard.</div>;
  const k = data.kpis;
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-primary">School overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">A 30-day operational view across learners, finance and attendance.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><KpiCard label="Students" value={k.students} icon={Users} trend={`${k.activeStudents} active`} /><KpiCard label="Collected" value={`KES ${k.collected.toLocaleString()}`} icon={Wallet} trend="Paid invoices" /><KpiCard label="Outstanding" value={`KES ${k.outstanding.toLocaleString()}`} icon={TrendingUp} trend="Due balance" /><KpiCard label="Attendance" value={`${k.attendanceRate.toFixed(1)}%`} icon={CalendarCheck} trend={`${k.admissions} admissions`} /></div>
    <div className="grid gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><Card><CardHeader><CardTitle>Attendance trend · 14 days</CardTitle></CardHeader><CardContent><TrendChart title="" data={data.attendanceTrend} /></CardContent></Card></div><Card><CardHeader><CardTitle>Recent payments</CardTitle></CardHeader><CardContent><div className="divide-y">{data.recentPayments.length === 0 ? <p className="py-2 text-sm text-muted-foreground">No payments yet.</p> : data.recentPayments.map((p, i) => <div key={i} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">{String(p.created_at).slice(0, 10)}</span><span className="font-semibold tabular-nums">KES {Number(p.amount).toLocaleString()}</span></div>)}</div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Payments trend</CardTitle></CardHeader><CardContent><TrendChart title="" data={data.paymentTrend} kind="bar" /></CardContent></Card>
  </div>;
}
