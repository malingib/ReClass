import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Port of (app)/admin/+page.server.ts dashboard load. */
export function useAdminDashboard(days = 30) {
  return useQuery({
    queryKey: ['admin-dashboard', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      // Settle independently: one missing table/view must not blank the whole dashboard.
      const settle = async <T>(p: PromiseLike<{ data: T | null; count?: number | null }>): Promise<{ data: T; count: number }> => {
        try {
          const r = await p;
          return { data: (r.data ?? []) as T, count: r.count ?? 0 };
        } catch {
          return { data: [] as unknown as T, count: 0 };
        }
      };
      const [attendance, payments, invoices, students, activeStudents, admissions] = await Promise.all([
        settle(supabase.from('v_teacher_attendance_daily').select('day,attended,absent,total').gte('day', since).order('day')),
        settle(supabase.from('payments').select('created_at,amount,status,method').gte('created_at', `${since}T00:00:00`).order('created_at')),
        settle(supabase.from('invoices').select('amount_due,amount_paid,status').is('deleted_at', null)),
        settle(supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
        settle(supabase.from('sis_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active')),
        settle(supabase.from('sis_admissions').select('id', { count: 'exact', head: true }).gte('created_at', `${since}T00:00:00`)),
      ]);
      const payRows = ((payments.data ?? []) as { status: string; amount: number; created_at: string }[]);
      const invRows = ((invoices.data ?? []) as { amount_due: number; amount_paid: number; status?: string }[]);
      const attRows = ((attendance.data ?? []) as { day: string; attended: number; absent: number; total: number }[]);
      const collected = payRows.filter((p) => p.status === 'paid').reduce((n, p) => n + Number(p.amount || 0), 0);
      const invoiced = invRows.reduce((n, i) => n + Number(i.amount_due || 0), 0);
      const paidLedger = invRows.reduce((n, i) => n + Number(i.amount_paid || 0), 0);
      const total = attRows.reduce((n, d) => n + Number(d.total || 0), 0);
      const present = attRows.reduce((n, d) => n + Number(d.attended || 0), 0);
      const absent = attRows.reduce((n, d) => n + Number(d.absent || 0), 0);
      const feeStatusMap = new Map<string, number>();
      for (const inv of invRows) feeStatusMap.set(inv.status || 'unknown', (feeStatusMap.get(inv.status || 'unknown') ?? 0) + 1);
      const STATUS_COLORS: Record<string, string> = {
        paid: 'var(--success)',
        partial: 'var(--warning)',
        unpaid: 'var(--destructive)',
        waived: 'var(--info)',
        overpaid: 'var(--primary)',
      };
      return {
        kpis: {
          students: students.count ?? 0,
          activeStudents: activeStudents.count ?? 0,
          admissions: admissions.count ?? 0,
          collected,
          outstanding: Math.max(0, invoiced - paidLedger),
          attendanceRate: total ? (present / total) * 100 : 0,
        },
        attendanceTrend: attRows.slice(-14).map((d) => ({ label: String(d.day).slice(5), value: Number(d.attended || 0), secondary: Number(d.absent || 0) })),
        paymentTrend: payRows.slice(-12).map((p) => ({ label: String(p.created_at).slice(5, 10), value: Number(p.amount || 0) })),
        recentPayments: payRows.slice(-6).reverse(),
        feeStatus: [...feeStatusMap.entries()].map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] })),
        attendanceSplit: [
          { label: 'Present', value: present, color: 'var(--success)' },
          { label: 'Absent', value: absent, color: 'var(--destructive)' },
        ],
      };
    },
  });
}
