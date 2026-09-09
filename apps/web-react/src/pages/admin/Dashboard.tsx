import { useAdminDashboard } from '@/hooks/useDashboard';
import { KpiCard } from '@/components/KpiCard';
import { TrendChart } from '@/components/TrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Users, Wallet, TrendingUp, CalendarCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard(30);
  if (isLoading || !data) return <div className="grid gap-4 md:grid-cols-4"><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="h-28 animate-pulse rounded-xl bg-muted" /></div>;
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of school operations — 30 days</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Students" value={k.students} icon={Users} trend={`${k.activeStudents} active`} />
        <KpiCard label="Collected" value={`KES ${k.collected.toLocaleString()}`} icon={Wallet} trend="Paid invoices" />
        <KpiCard label="Outstanding" value={`KES ${k.outstanding.toLocaleString()}`} icon={TrendingUp} trend="Due balance" />
        <KpiCard label="Attendance" value={`${k.attendanceRate.toFixed(1)}%`} icon={CalendarCheck} trend={`${k.admissions} admissions`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Attendance (14d)</CardTitle></CardHeader>
            <CardContent><TrendChart title="" data={data.attendanceTrend} /></CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet</p>
              ) : (
                data.recentPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{String(p.created_at).slice(0, 10)}</span>
                    <span className="font-medium">KES {Number(p.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Payments trend</CardTitle></CardHeader>
        <CardContent><TrendChart title="" data={data.paymentTrend} kind="bar" /></CardContent>
      </Card>
    </div>
  );
}
