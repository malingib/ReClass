import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRemedialDashboard() {
  return useQuery({
    queryKey: ['remedial-dashboard'],
    queryFn: async () => {
      const [sessions, attendance, enrollments] = await Promise.all([
        supabase.from('sessions').select('id,status,scheduled_for').order('scheduled_for', { ascending: false }).limit(10),
        supabase.from('teacher_attendance').select('id,status,marked_at').order('marked_at', { ascending: false }).limit(50),
        supabase.from('sis_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      return { sessions: sessions.data ?? [], attendance: attendance.data ?? [], activeEnrollments: enrollments.count ?? 0 };
    },
  });
}

export function useAttendance(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['attendance', page],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('teacher_attendance')
        .select('*,teachers(first_name,last_name)', { count: 'exact' })
        .order('marked_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      return { rows: (data ?? []) as Record<string, never>[], total: count ?? 0 };
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      return (data ?? []) as Record<string, never>[];
    },
  });
}
