import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export function useRemedialDashboard() {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['remedial-dashboard', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const [sessions, attendance, enrollments] = await Promise.all([
        supabase.from('sessions').select('id,status,scheduled_for').eq('tenant_id', ctx!.tenantId).order('scheduled_for', { ascending: false }).limit(10),
        supabase.from('teacher_attendance').select('id,status,marked_at').eq('tenant_id', ctx!.tenantId).order('marked_at', { ascending: false }).limit(50),
        supabase.from('sis_enrollments').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx!.tenantId).eq('status', 'active'),
      ]);
      return { sessions: sessions.data ?? [], attendance: attendance.data ?? [], activeEnrollments: enrollments.count ?? 0 };
    },
  });
}

export function useAttendance(page = 1, pageSize = 50) {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['attendance', ctx?.tenantId, page],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data, count } = await supabase
        .from('teacher_attendance')
        .select('*,teachers(first_name,last_name)', { count: 'exact' })
        .eq('tenant_id', ctx!.tenantId)
        .order('marked_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      return { rows: (data ?? []) as Record<string, never>[], total: count ?? 0 };
    },
  });
}

export function useNotifications() {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['notifications', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('tenant_id', ctx!.tenantId).order('created_at', { ascending: false }).limit(50);
      return (data ?? []) as Record<string, never>[];
    },
  });
}
