import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { DataTable } from '@/components/DataTable';
import { Button, LoadingButton } from '@/components/ui';
import { useState } from 'react';

export function TeacherDashboard() {
  const { data: ctx } = useTenant();
  const { data: tasks = [] } = useQuery({
    queryKey: ['teacher-tasks', ctx?.userId],
    enabled: !!ctx?.userId,
    queryFn: async () => {
      const { data } = await supabase.from('teacher_tasks').select('*').eq('teacher_id', ctx!.userId).order('due_at').limit(20);
      return (data ?? []) as Record<string, unknown>[];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Teacher workspace</h1>
      <DataTable columns={['Task', 'Status', 'Due']} rows={tasks.map((t) => [t.title, t.status, t.due_at])} />
    </div>
  );
}

export function MarkAttendance() {
  const { data: ctx } = useTenant();
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const mark = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('teacher_attendance').insert({ teacher_id: ctx!.userId, tenant_id: ctx!.tenantId, status });
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg('Marked.');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (e) => setMsg(`Failed: ${(e as Error).message}`),
  });
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Mark attendance</h1>
      <div className="flex gap-2">
        <LoadingButton loading={mark.isPending} onClick={() => mark.mutate('present')}>Present</LoadingButton>
        <Button onClick={() => mark.mutate('absent')}>Absent</Button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
