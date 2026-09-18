import { useAdminDashboard } from '@/hooks/useDashboard';
import { KpiCard } from '@/components/KpiCard';
import { useTenant } from '@/hooks/useTenant';
import { useSchool } from '@/hooks/useSchool';
import { DataTable } from '@/components/DataTable';
import { Modules } from '@/pages/admin/Tables';

export function PrincipalDashboard() {
  const { data } = useAdminDashboard(30);
  const k = data?.kpis;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Principal oversight</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard label="Students" value={k?.students ?? '…'} />
        <KpiCard label="Collected (KES)" value={(k?.collected ?? 0).toLocaleString()} />
        <KpiCard label="Attendance %" value={k ? k.attendanceRate.toFixed(1) : '…'} />
      </div>
    </div>
  );
}

export function SchoolOverview() {
  const { data: school } = useSchool();
  const rows: [string, string][] = [
    ['School', school?.name ?? '—'],
    ['Code', school?.slug ?? '—'],
    ['School-fee channel', school?.school_payment_channel ?? '—'],
    ['Remedial-fee channel', school?.remedial_payment_channel ?? '—'],
    ['SMS sender', school?.sms_sender_id ?? '—'],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">School</h1>
      <DataTable columns={['Field', 'Value']} rows={rows} pagination="none" />
    </div>
  );
}

export function BursarDashboard() {
  const { data } = useAdminDashboard(30);
  const k = data?.kpis;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bursar</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard label="Collected (KES)" value={(k?.collected ?? 0).toLocaleString()} />
        <KpiCard label="Outstanding (KES)" value={(k?.outstanding ?? 0).toLocaleString()} />
        <KpiCard label="Students" value={k?.students ?? '…'} />
      </div>
    </div>
  );
}

export function SuperAdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">System administration</h1>
      <Modules />
    </div>
  );
}

export function Account() {
  const { data: ctx } = useTenant();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Account</h1>
      <DataTable columns={['Field', 'Value']} rows={[['User', ctx?.userId], ['Active role', ctx?.activeRole], ['Roles', ctx?.roles.join(', ')]]} />
    </div>
  );
}

export function About() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">About eShule</h1>
      <p className="text-sm">Single-school operations platform. ReClass is the remedial learning module.</p>
    </div>
  );
}
