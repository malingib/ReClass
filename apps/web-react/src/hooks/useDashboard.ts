import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

/** Port of (app)/admin/+page.server.ts dashboard load. */
export function useAdminDashboard(days = 30) {
  const { data: ctx } = useTenant();
  const tenantId = ctx?.tenantId;
  return useQuery({
    queryKey: ['admin-dashboard', tenantId, days],
    enabled: !!tenantId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const [attendance, payments, invoices, students, activeStudents, admissions] = await Promise.all([
        supabase.from('v_teacher_attendance_daily').select('day,attended,absent,total').eq('tenant_id', tenantId).gte('day', since).order('day'),
        supabase.from('payments').select('created_at,amount,status,method').eq('tenant_id', tenantId).gte('created_at', `${since}T00:00:00`).order('created_at'),
        supabase.from('invoices').select('amount_due,amount_paid,status').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('sis_enrollments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
        supabase.from('sis_admissions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', `${since}T00:00:00`),
      ]);
      const payRows = ((payments.data ?? []) as { status: string; amount: number; created_at: string }[]);
      const invRows = ((invoices.data ?? []) as { amount_due: number; amount_paid: number }[]);
      const attRows = ((attendance.data ?? []) as { day: string; attended: number; absent: number; total: number }[]);
      const collected = payRows.filter((p) => p.status === 'paid').reduce((n, p) => n + Number(p.amount || 0), 0);
      const invoiced = invRows.reduce((n, i) => n + Number(i.amount_due || 0), 0);
      const paidLedger = invRows.reduce((n, i) => n + Number(i.amount_paid || 0), 0);
      const total = attRows.reduce((n, d) => n + Number(d.total || 0), 0);
      const present = attRows.reduce((n, d) => n + Number(d.attended || 0), 0);
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
      };
    },
  });
}
