import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Button, LoadingButton } from '@/components/ui';
import { useState } from 'react';

type Occurrence = {
  id: string;
  occurs_on: string;
  start_time: string;
  end_time: string;
  class: string | null;
  room: string | null;
  status: string;
};

export function TeacherDashboard() {
  const { data: ctx } = useTenant();
  const { data: teacher } = useQuery({
    queryKey: ['teacher-profile', ctx?.userId],
    enabled: !!ctx?.userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('id,first_name,last_name,employee_no').eq('profile_id', ctx!.userId).is('deleted_at', null).maybeSingle();
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string; employee_no: string | null } | null;
    },
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['teacher-occurrences', teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('session_occurrences').select('id,occurs_on,start_time,end_time,class,room,status').eq('teacher_id', teacher!.id).order('occurs_on', { ascending: true }).order('start_time', { ascending: true }).limit(20);
      if (error) throw error;
      return (data ?? []) as Occurrence[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Teacher workspace</h1>
        <p className="text-sm text-muted-foreground">Assigned sessions, attendance and payroll evidence.</p>
      </div>
      {teacher && <p className="text-sm">{teacher.first_name} {teacher.last_name}{teacher.employee_no ? ` · ${teacher.employee_no}` : ''}</p>}
      <section className="space-y-3">
        <h2 className="font-medium">Upcoming assigned sessions</h2>
        {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No assigned sessions found.</p> : (
          <div className="divide-y rounded-md border">
            {sessions.map((s) => <div key={s.id} className="flex items-center justify-between gap-4 p-4 text-sm">
              <div><div className="font-medium">{s.class || 'Remedial session'}</div><div className="text-muted-foreground">{s.occurs_on} · {s.start_time}–{s.end_time}{s.room ? ` · ${s.room}` : ''}</div></div>
              <span className="capitalize text-muted-foreground">{s.status}</span>
            </div>)}
          </div>
        )}
      </section>
    </div>
  );
}

export function MarkAttendance() {
  const { data: ctx } = useTenant();
  const qc = useQueryClient();
  const [occurrenceId, setOccurrenceId] = useState('');
  const [msg, setMsg] = useState('');
  const { data: teacher } = useQuery({
    queryKey: ['teacher-profile', ctx?.userId],
    enabled: !!ctx?.userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('id,first_name,last_name').eq('profile_id', ctx!.userId).is('deleted_at', null).maybeSingle();
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string } | null;
    },
  });
  const { data: occurrences = [] } = useQuery({
    queryKey: ['teacher-attendance-occurrences', teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('session_occurrences').select('id,occurs_on,start_time,end_time,class,room,status').eq('teacher_id', teacher!.id).neq('status', 'cancelled').order('occurs_on', { ascending: false }).order('start_time', { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as Occurrence[];
    },
  });
  const mark = useMutation({
    mutationFn: async (status: 'attended' | 'absent') => {
      if (!teacher?.id || !ctx?.userId || !occurrenceId) throw new Error('Select a session first.');
      const { data, error } = await supabase.rpc('mark_own_teacher_attendance', { p_teacher_id: teacher.id, p_profile_id: ctx.userId, p_occurrence_id: occurrenceId, p_status: status });
      if (error) throw error;
      return data as { status?: string };
    },
    onSuccess: (data) => {
      setMsg(data?.status === 'already_approved' ? 'This attendance is already approved.' : 'Attendance recorded and sent for review.');
      qc.invalidateQueries({ queryKey: ['teacher-attendance-occurrences', teacher?.id] });
      qc.invalidateQueries({ queryKey: ['teacher-occurrences', teacher?.id] });
    },
    onError: (e) => setMsg(`Failed: ${(e as Error).message}`),
  });

  return (
    <div className="max-w-xl space-y-5">
      <div><h1 className="text-xl font-semibold">Teacher attendance</h1><p className="text-sm text-muted-foreground">Record only Attended or Absent. Approval turns attendance into payroll evidence.</p></div>
      <label className="block space-y-2 text-sm"><span className="font-medium">Session</span><select className="w-full rounded-md border bg-background px-3 py-2" value={occurrenceId} onChange={(e) => setOccurrenceId(e.target.value)}><option value="">Select a session</option>{occurrences.map((o) => <option key={o.id} value={o.id}>{o.occurs_on} · {o.start_time}–{o.end_time} · {o.class || 'Remedial'}</option>)}</select></label>
      <div className="flex gap-2"><LoadingButton loading={mark.isPending} disabled={!occurrenceId} onClick={() => mark.mutate('attended')}>Attended</LoadingButton><Button disabled={!occurrenceId || mark.isPending} onClick={() => mark.mutate('absent')}>Absent</Button></div>
      {msg && <p className="text-sm" role="status">{msg}</p>}
    </div>
  );
}
