import { useAdminDashboard } from '@/hooks/useDashboard';
import { useSchool } from '@/hooks/useSchool';
import { useTenant } from '@/hooks/useTenant';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { Modules } from '@/pages/admin/Tables';
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
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import { Users, Wallet, TrendingUp, CalendarCheck } from 'lucide-react';

// ──────────────────────────── PRINCIPAL DASHBOARD ────────────────────────────

export function PrincipalDashboard() {
  const { data, isLoading, isError, refetch } = useAdminDashboard(30);
  const k = data?.kpis;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="School overview" title="Principal oversight" description="Live school operations, attendance and finances." />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="School overview" title="Principal oversight" />
        <Card><CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Could not load the principal dashboard.</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const recentPayments = data?.recentPayments ?? [];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="School overview" title="Principal oversight" description="Live school operations, attendance and finances. Teacher performance analytics ship with the results module." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Students" value={k?.students ?? '…'} icon={Users} trend={`${k?.activeStudents ?? 0} active`} />
        <KpiCard label="Collected (KES)" value={(k?.collected ?? 0).toLocaleString()} icon={Wallet} trend="Paid invoices" />
        <KpiCard label="Attendance %" value={k ? k.attendanceRate.toFixed(1) : '…'} icon={CalendarCheck} trend={`${k?.admissions ?? 0} admissions`} />
        <KpiCard label="Outstanding (KES)" value={(k?.outstanding ?? 0).toLocaleString()} icon={TrendingUp} trend="Due balance" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue trend (live)</CardTitle></CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Teacher performance</CardTitle></CardHeader>
          <CardContent>
            <p className="py-6 text-center text-sm text-muted-foreground">Teacher performance analytics will appear once exam results ship.</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent payments (live)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={['Date', 'Amount']}
            rows={recentPayments.slice(0, 8).map((p) => [String(p.created_at).slice(0, 10), `KES ${Number(p.amount).toLocaleString()}`] as [string, string])}
            empty="No payments yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── SCHOOL OVERVIEW ────────────────────────────

export function SchoolOverview() {
  const { data: school, isLoading, isError, refetch } = useSchool();
  const rows: [string, string][] = [
    ['School', school?.name ?? '—'],
    ['Code', school?.slug ?? '—'],
    ['Academic year', school?.academic_year ?? '—'],
    ['Timezone', school?.timezone ?? 'Africa/Nairobi'],
    ['School-fee channel', school?.school_payment_channel ?? '—'],
    ['Remedial-fee channel', school?.remedial_payment_channel ?? '—'],
    ['SMS sender', school?.sms_sender_id ?? '—'],
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="School overview" description="School information, infrastructure and staff summary." />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="School overview" description="School information, infrastructure and staff summary." />
        <Card><CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Could not load school information.</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="School overview" description="Live school information from settings." />
      <Card>
        <CardHeader><CardTitle>School information</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable columns={['Field', 'Value']} rows={rows} pagination="none" />
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── BURSAR DASHBOARD ────────────────────────────

export function BursarDashboard() {
  const { data, isLoading, isError, refetch } = useAdminDashboard(30);
  const k = data?.kpis;
  const collectedLive = k?.collected ?? 0;
  const outstandingLive = k?.outstanding ?? 0;
  const billedLive = collectedLive + outstandingLive;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bursar dashboard" description="Live financial overview and collection status." />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bursar dashboard" description="Live financial overview and collection status." />
        <Card><CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Could not load the bursar dashboard.</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bursar dashboard" description="Live financial overview and collection status." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Collected (KES)" value={(k?.collected ?? 0).toLocaleString()} icon={Wallet} />
        <KpiCard label="Outstanding (KES)" value={(k?.outstanding ?? 0).toLocaleString()} icon={TrendingUp} />
        <KpiCard label="Students" value={k?.students ?? '…'} icon={Users} />
        <KpiCard label="Collection Rate" value={billedLive > 0 ? `${((collectedLive / billedLive) * 100).toFixed(1)}%` : '…'} icon={CalendarCheck} description="Collected vs billed (live)" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Collection trend (live)</CardTitle></CardHeader>
          <CardContent>
            {(data?.monthlyRevenue ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No collection data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.monthlyRevenue ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent payments (live)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Amount']}
              rows={(data?.recentPayments ?? []).slice(0, 8).map((p) => [String(p.created_at).slice(0, 10), `KES ${Number(p.amount).toLocaleString()}`] as [string, string])}
              empty="No payments yet."
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Fee-type and expense breakdowns</CardTitle></CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">Detailed breakdowns ship with the fee-type reporting module.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── SUPER ADMIN DASHBOARD ────────────────────────────

export function SuperAdminDashboard() {
  const { data: school } = useSchool();
  return (
    <div className="space-y-6">
      <PageHeader title="System administration" description={school?.name ? `Single-school deployment · ${school.name}` : 'Single-school system overview and operations.'} />
      <Card>
        <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
        <CardContent className="p-0"><Modules /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Operations</CardTitle></CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">Service health monitoring ships with the operations module. Use Audit and Tenant Settings for live oversight.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── ABOUT ────────────────────────────

export function About() {
  const { data: school, isLoading, isError, refetch } = useSchool();

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="About" description="School and application information." />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="About" description="School and application information." />
        <Card><CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Could not load school information.</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="About" description="School and application information." />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
              {school?.name?.charAt(0) ?? 'S'}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{school?.name ?? 'School Management System'}</h2>
              <p className="text-sm text-muted-foreground">{school?.slug ?? 'eshule'} · Academic year {school?.academic_year ?? '—'}</p>
            </div>
          </div>
          <div className="grid gap-3 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span>eShule School Management</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>2.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Timezone</span><span>{school?.timezone ?? 'Africa/Nairobi'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{school?.currency ?? 'KES'}</span></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
        <CardContent className="p-0"><Modules /></CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── ACCOUNT ────────────────────────────

export function Account() {
  const { data: ctx, isLoading, isError, refetch } = useTenant();

  const ROLE_LABELS: Record<string, string> = {
    school_admin: 'School Admin',
    principal: 'Principal',
    teacher: 'Teacher',
    remedial_teacher: 'Remedial Teacher',
    bursar: 'Bursar',
    payroll: 'Payroll',
    reclass_chair: 'ReClass Chair',
    reclass_secretary: 'ReClass Secretary',
    reclass_treasurer: 'ReClass Treasurer',
    reclass_member: 'ReClass Committee Member',
    parent: 'Parent',
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Account" description="Your account information and role assignments." />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Account" description="Your account information and role assignments." />
        <Card><CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Could not load account information.</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Account" description="Your account information and role assignments." />
      <Card>
        <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {ctx?.userId?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <p className="font-medium">{ctx?.userId ?? '—'}</p>
              <p className="text-sm text-muted-foreground">User ID</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Roles & permissions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm font-medium">Active role</span>
            <Badge variant="default">{ROLE_LABELS[ctx?.activeRole ?? ''] ?? ctx?.activeRole ?? '—'}</Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">All roles</p>
            <div className="flex flex-wrap gap-2">
              {(ctx?.roles ?? []).map((role) => (
                <Badge key={role} variant={role === ctx?.activeRole ? 'default' : 'outline'}>
                  {ROLE_LABELS[role] ?? role}
                </Badge>
              ))}
              {(!ctx?.roles || ctx.roles.length === 0) && <p className="text-sm text-muted-foreground">No roles assigned.</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
