import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdminDashboard } from '@/hooks/useDashboard';
import { useReceipts } from '@/hooks/useFinance';
import { supabase } from '@/integrations/supabase/client';
import { KpiCard } from '@/components/KpiCard';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, ButtonLink } from '@/components/ui';
import {
  Users,
  GraduationCap,
  Wallet,
  CalendarCheck,
  CreditCard,
  ClipboardCheck,
  Clock,
  DollarSign,
  Calendar,
  Bell,
  CircleDollarSign,
  UserPlus,
} from 'lucide-react';
import { isSchoolPayment, moneyCompactKES, moneyKES } from '@/lib/format';

/** Monthly collected bars + cumulative line. Beats the old area chart:
 *  bars show run-rate, the line shows trajectory toward the term. */
function RevenueChart({ months }: { months: { month: string; amount: number }[] }) {
  const rows = useMemo(() => {
    let run = 0;
    return months.slice(-12).map((m) => ({ ...m, cumulative: (run += m.amount) }));
  }, [months]);
  const total = rows.reduce((n, r) => n + r.amount, 0);
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No revenue collected yet.</p>;
  }
  return (
    <div>
      <div role="img" aria-label={`School fee collection, ${rows.length} months, total ${moneyKES(total)}`}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => moneyCompactKES(v)} width={64} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }}
              formatter={(value, name) => [moneyKES(value), name === 'amount' ? 'Collected' : 'Cumulative']}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend formatter={(v) => (v === 'amount' ? 'Collected' : 'Cumulative')} />
            <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Line type="monotone" dataKey="cumulative" stroke="var(--success)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-center sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-lg font-bold tabular-nums">{moneyCompactKES(total)}</p></div>
        <div><p className="text-xs text-muted-foreground">Best month</p><p className="text-lg font-bold tabular-nums">{rows.length ? moneyCompactKES(Math.max(...rows.map((r) => r.amount))) : '—'}</p></div>
        <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">Months</p><p className="text-lg font-bold tabular-nums">{rows.length}</p></div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError } = useAdminDashboard(90);
  const today = new Date().toISOString().slice(0, 10);
  const { data: todaySessions = [] } = useQuery({
    queryKey: ['dashboard-today-sessions', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_occurrences')
        .select('id,class,teacher_id,status')
        .eq('occurs_on', today)
        .neq('status', 'cancelled')
        .limit(200);
      if (error) throw error;
      return (data ?? []) as { id: string; class: string | null; teacher_id: string | null; status: string }[];
    },
  });
  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ['dashboard-pending-approvals'],
    queryFn: async () => {
      const { count, error } = await supabase.from('teacher_attendance').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const { data: receiptPage } = useReceipts(1, 200);
  const remedialCollected = useMemo(
    () => (receiptPage?.rows ?? []).filter((r) => r.status === 'paid' && !isSchoolPayment(r.domain)).reduce((n, r) => n + Number(r.amount || 0), 0),
    [receiptPage],
  );
  const currentDate = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const recentActivities = useMemo(() => {
    if (!data) return [];
    const activities: { id: string; text: string; time: string; type: 'admission' | 'payment' | 'attendance' | 'notice' }[] = [];
    if (data.recentPayments.length > 0) {
      data.recentPayments.slice(0, 3).forEach((p, i) => {
        activities.push({
          id: `pay-${i}`,
          text: `Fee payment of ${moneyKES(p.amount)} received`,
          time: String(p.created_at).slice(0, 10),
          type: 'payment',
        });
      });
    }
    if (data.kpis.admissions > 0) {
      activities.push({
        id: 'adm-1',
        text: `${data.kpis.admissions} new student${data.kpis.admissions === 1 ? '' : 's'} admitted this period`,
        time: 'This month',
        type: 'admission',
      });
    }
    if (data.kpis.attendanceRate > 0) {
      activities.push({
        id: 'att-1',
        text: `Teacher attendance: ${data.kpis.attendanceRate.toFixed(1)}% marked across remedial and normal classes`,
        time: '90-day average',
        type: 'attendance',
      });
    }
    return activities;
  }, [data]);

  const monthlyRevenueData = useMemo(() => data?.monthlyRevenue ?? [], [data?.monthlyRevenue]);
  const attendanceTrend = useMemo(() => data?.attendanceTrend ?? [], [data?.attendanceTrend]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="School overview" title="Dashboard" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 animate-pulse rounded-md bg-muted" />
          <div className="h-80 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="School overview" title="Dashboard" />
        <EmptyState
          title="Unable to load the school dashboard"
          description="The school context or dashboard views are unavailable. Check your connection and tenant setup, then retry."
        />
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="School overview"
        title="Good morning, Administrator"
        description={currentDate}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Students"
          value={k.students}
          icon={Users}
          description={`${k.activeStudents} active enrollments`}
          className="border-l-2 border-l-primary/40"
        />
        <KpiCard
          label="Total Teachers"
          value={k.teachers}
          icon={GraduationCap}
          description={`${k.admissions} new admissions this period`}
          className="border-l-2 border-l-primary/40"
        />
        <KpiCard
          label="School Fees"
          value={moneyKES(k.collected)}
          icon={Wallet}
          description={`${moneyKES(k.outstanding)} outstanding`}
          className="border-l-2 border-l-primary/40"
        />
        <KpiCard
          label="Remedial Fees"
          value={moneyKES(remedialCollected)}
          icon={CircleDollarSign}
          description="Parent payments · latest 200 receipts"
          className="border-l-2 border-l-primary/40"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/admin/fees" className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:bg-primary/5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30 dark:text-blue-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Collect Fees</p>
            <p className="text-xs text-muted-foreground">School payments</p>
          </div>
        </Link>
        <Link to="/admin/fee" className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:bg-primary/5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white dark:bg-green-900/30 dark:text-green-400">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Remedial Fees</p>
            <p className="text-xs text-muted-foreground">Parent balances</p>
          </div>
        </Link>
        <Link to="/admin/attendance/review" className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:bg-primary/5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-900/30 dark:text-purple-400">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Review Attendance</p>
            <p className="text-xs text-muted-foreground">{pendingApprovals > 0 ? `${pendingApprovals} awaiting approval` : 'Queue clear'}</p>
          </div>
        </Link>
        <Link to="/admin/scheduling" className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:bg-primary/5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-900/30 dark:text-orange-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">View Schedule</p>
            <p className="text-xs text-muted-foreground">Session slots</p>
          </div>
        </Link>
      </div>

      {/* Revenue Chart + Teacher Attendance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>School Fee Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart months={monthlyRevenueData} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Teacher Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{k.attendanceRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Marked rate · remedial + normal classes · 90 days</p>
            </div>
            {attendanceTrend.length > 0 ? (
              <div role="img" aria-label={`Teacher attendance, last ${attendanceTrend.length} days`}>
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                    <Bar dataKey="value" name="Marked present" fill="var(--success)" maxBarSize={14} />
                    <Bar dataKey="secondary" name="Absent" fill="var(--destructive)" maxBarSize={14} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-muted-foreground">No attendance marks in this period.</p>
            )}
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Today needs attention</p>
              <p className="text-muted-foreground">{todaySessions.length} session{todaySessions.length === 1 ? '' : 's'} scheduled today — remind teachers to mark attendance.</p>
              {pendingApprovals > 0 && <p className="text-muted-foreground">{pendingApprovals} marked row{pendingApprovals === 1 ? '' : 's'} awaiting approval.</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <ButtonLink to="/admin/attendance" variant="outline" size="sm">Mark attendance</ButtonLink>
                <ButtonLink to="/admin/attendance/review" variant="outline" size="sm">Review queue</ButtonLink>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities + Upcoming Events */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No recent activities.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          activity.type === 'payment'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : activity.type === 'admission'
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                              : activity.type === 'attendance'
                                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}
                      >
                        {activity.type === 'payment' ? (
                          <DollarSign className="h-4 w-4" />
                        ) : activity.type === 'admission' ? (
                          <UserPlus className="h-4 w-4" />
                        ) : activity.type === 'attendance' ? (
                          <CalendarCheck className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleCalendar compact />
            <div className="mt-3 border-t pt-3">
              <ButtonLink to="/admin/scheduling" variant="outline" size="sm">Open scheduling calendar</ButtonLink>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {data.recentPayments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              data.recentPayments.map((p, i) => (
                <div key={`${p.created_at}-${p.amount}-${i}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{String(p.created_at).slice(0, 10)}</p>
                    <p className="text-xs text-muted-foreground">Payment</p>
                  </div>
                  <span className="font-semibold tabular-nums">{moneyKES(p.amount)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
