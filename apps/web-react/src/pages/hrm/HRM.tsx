import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { KpiCard } from '@/components/KpiCard';
import {
  Button, Card, CardContent,
  Input, PageHeader, StatusPill,
} from '@/components/ui';
import {
  Clock, CalendarDays,
  CheckCircle,
} from 'lucide-react';

/* HRM now covers live teacher attendance only (remedial + normal classes).
   Mock payroll/leave/holiday/staff surfaces were removed — school payroll
   lives under Finance, holidays under the School Calendar. */

type LiveTeacherMark = {
  id: string;
  status: string;
  marked_at: string;
  approval_status: string | null;
  teachers: { first_name?: string | null; last_name?: string | null; employee_no?: string | null } | null;
};

/* ================================================================
   TeacherAttendance
   ================================================================ */

export function TeacherAttendance() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: records = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['hrm-teacher-attendance', selectedDate],
    queryFn: async () => {
      const start = `${selectedDate}T00:00:00`;
      const end = new Date(new Date(selectedDate).getTime() + 864e5).toISOString().slice(0, 10) + 'T00:00:00';
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('id,status,marked_at,approval_status,teachers(first_name,last_name,employee_no)')
        .is('deleted_at', null)
        .gte('marked_at', start)
        .lt('marked_at', end)
        .order('marked_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LiveTeacherMark[];
    },
  });

  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const pending = records.filter((r) => (r.approval_status ?? 'pending') === 'pending').length;
  const nameOf = (r: (typeof records)[number]) => `${r.teachers?.first_name ?? ''} ${r.teachers?.last_name ?? ''}`.trim() || '—';

  return (
    <div className="space-y-4">
      <PageHeader title="Teacher Attendance" description="Live teacher marks for remedial and normal classes — remind unmarked teachers, then review." />
      <div className="flex gap-3">
        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="max-w-[200px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Marked" value={String(records.length)} icon={CheckCircle} description={`Teachers marked · ${selectedDate}`} />
        <KpiCard title="Present" value={String(present)} icon={Clock} description="Present or late" />
        <KpiCard title="Pending Review" value={String(pending)} icon={CalendarDays} description="Awaiting approval" />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading attendance…</p>
      ) : isError ? (
        <Card><CardContent className="space-y-2 p-6 text-sm">
          <p className="font-medium">Could not load teacher attendance.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </CardContent></Card>
      ) : (
        <DataTable
          columns={['Teacher', 'Employee No', 'Marked', 'Review', 'Time']}
          rows={records.map((r) => [
            nameOf(r),
            r.teachers?.employee_no ?? '—',
            <StatusPill key={`s-${r.id}`} status={r.status} />,
            <StatusPill key={`a-${r.id}`} status={r.approval_status ?? 'pending'} />,
            r.marked_at ? new Date(r.marked_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—',
          ])}
          empty={`No teacher attendance marked for ${selectedDate}. Remind teachers to mark.`}
        />
      )}
    </div>
  );
}
