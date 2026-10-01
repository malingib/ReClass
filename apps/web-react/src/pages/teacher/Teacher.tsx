import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { DataTable } from '@/components/DataTable';
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  StatusPill,
  TableSkeleton,
} from '@/components/ui';
import { dateKE, fullName } from '@/lib/format';
import { useEffect } from 'react';
import {
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Search,
  Plus,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Occurrence = {
  id: string;
  occurs_on: string;
  start_time: string;
  end_time: string;
  class: string | null;
  room: string | null;
  status: string;
};

type TeacherRow = {
  id: string;
  first_name: string;
  last_name: string;
  employee_no: string | null;
  phone?: string | null;
};

/* ------------------------------------------------------------------ */
/*  TeacherDashboard                                                   */
/* ------------------------------------------------------------------ */

export function TeacherDashboard() {
  const { data: ctx } = useTenant();
  const { data: teacher, isLoading: teacherLoading, isError: teacherError } = useQuery({
    queryKey: ['teacher-profile', ctx?.userId],
    enabled: !!ctx?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id,first_name,last_name,employee_no')
        .eq('profile_id', ctx!.userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string; employee_no: string | null } | null;
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError } = useQuery({
    queryKey: ['teacher-occurrences', teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_occurrences')
        .select('id,occurs_on,start_time,end_time,class,room,status')
        .eq('teacher_id', teacher!.id)
        .order('occurs_on', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Occurrence[];
    },
  });

  const { data: attendanceMarks = [] } = useQuery({
    queryKey: ['teacher-attendance-marks', teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('id,status')
        .eq('teacher_id', teacher!.id)
        .is('deleted_at', null)
        .limit(100);
      if (error) throw error;
      return (data ?? []) as { id: string; status: string }[];
    },
  });

  const uniqueClasses = new Set(sessions.map((s) => s.class).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.occurs_on === today);
  const presentMarks = attendanceMarks.filter((m) => m.status === 'present' || m.status === 'late').length;
  const attendanceRate = attendanceMarks.length > 0
    ? Math.round((presentMarks / attendanceMarks.length) * 100)
    : null;
  const currentHour = new Date().getHours();

  if (teacherLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (teacherError || sessionsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher dashboard" description="Your teaching overview." />
        <EmptyState
          title="Unable to load the teacher dashboard"
          description="The teacher profile or assigned sessions could not be loaded. Check your connection and try again."
        />
      </div>
    );
  }

  if (!teacher) {
    const canManageStaff = !!ctx?.roles?.some((r) => r === 'school_admin' || r === 'super_admin' || r === 'principal');
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher dashboard" description="Your teaching overview." />
        <EmptyState
          title="No teacher profile linked"
          description={canManageStaff ? 'This sign-in is not linked to a teacher record. Manage staffing from the Teachers list.' : 'Your sign-in is not linked to a teacher record yet. Ask a school administrator to link it.'}
          action={canManageStaff ? <ButtonLink to="/admin/teachers" variant="outline">Go to Teachers</ButtonLink> : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {teacher?.first_name ?? 'Teacher'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'} — here's your teaching overview.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">My Classes</p>
                <p className="text-2xl font-bold">{uniqueClasses.size || sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Sessions</p>
                <p className="text-2xl font-bold">{todaySessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold">{attendanceRate === null ? 'No data' : `${attendanceRate}%`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Upcoming assigned sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assigned sessions found.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <div className="font-medium">{s.class || 'Remedial session'}</div>
                  <div className="text-muted-foreground">
                    {s.occurs_on} · {s.start_time}–{s.end_time}{s.room ? ` · ${s.room}` : ''}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TeacherList                                                        */
/* ------------------------------------------------------------------ */

export function TeacherList() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['teachers-list', search],
    queryFn: async () => {
      let q = supabase
        .from('teachers')
        .select('id,first_name,last_name,employee_no,phone')
        .is('deleted_at', null)
        .order('first_name');
      if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_no.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TeacherRow[];
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teachers"
        description="Manage teacher records and assignments."
        action={<ButtonLink to="/admin/teachers/add"><Plus className="h-4 w-4" /> Add Teacher</ButtonLink>}
      />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search teachers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState
          title="Unable to load teachers"
          description="Teacher records could not be loaded. Check your connection and try again."
        />
      ) : (
        <DataTable
          columns={['Name', 'Employee No', 'Phone']}
          rows={(data ?? []).map((t) => [
            fullName(t.first_name, t.last_name),
            t.employee_no ?? '—',
            t.phone ?? '—',
          ])}
          empty="No teachers found."
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AddTeacher                                                         */
/* ------------------------------------------------------------------ */

export function AddTeacher() {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [phone, setPhone] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) throw new Error('First and last name are required.');
      const { data: tenantRow, error: tenantError } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      if (tenantError) throw tenantError;
      const tenantId = (tenantRow as { id: string } | null)?.id;
      if (!tenantId) throw new Error('No school found for this account. Ask your administrator to set up the school first.');
      const { error } = await supabase.from('teachers').insert({
        tenant_id: tenantId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        employee_no: employeeNo.trim() || null,
        phone: phone.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Teacher added.');
      qc.invalidateQueries({ queryKey: ['teachers-list'] });
      setFirstName('');
      setLastName('');
      setEmployeeNo('');
      setPhone('');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader title="Add Teacher" description="Create a new teacher record." />
      <Field label="First name">
        <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </Field>
      <Field label="Last name">
        <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </Field>
      <Field label="Employee number" hint="Optional unique identifier.">
        <Input placeholder="EMP001" value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} />
      </Field>
      <Field label="Phone" hint="Optional contact number.">
        <Input placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </Field>
      <LoadingButton
        loading={create.isPending}
        disabled={!firstName.trim() || !lastName.trim()}
        onClick={() => create.mutate()}
      >
        Add Teacher
      </LoadingButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TeacherProfile                                                     */
/* ------------------------------------------------------------------ */

export function TeacherProfile() {
  const { data: ctx } = useTenant();
  const { data: teacher, isLoading: teacherLoading, isError: teacherError } = useQuery({
    queryKey: ['teacher-profile', ctx?.userId],
    enabled: !!ctx?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id,first_name,last_name,employee_no,phone')
        .eq('profile_id', ctx!.userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as TeacherRow | null;
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError } = useQuery({
    queryKey: ['teacher-occurrences', teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_occurrences')
        .select('id,occurs_on,start_time,end_time,class,room,status')
        .eq('teacher_id', teacher!.id)
        .order('occurs_on', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Occurrence[];
    },
  });

  const uniqueClasses = new Set(sessions.map((s) => s.class).filter(Boolean));
  const upcomingSessions = sessions.filter((s) => s.occurs_on >= new Date().toISOString().slice(0, 10));

  if (teacherLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher Profile" description="Your detailed profile and teaching assignments." />
        <div className="h-28 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (teacherError || sessionsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher Profile" description="Your detailed profile and teaching assignments." />
        <EmptyState
          title="Unable to load the teacher profile"
          description="The profile or teaching schedule could not be loaded. Check your connection and try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Teacher Profile" description="Your detailed profile and teaching assignments." />

      {teacher && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
                {teacher.first_name?.[0]}{teacher.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{fullName(teacher.first_name, teacher.last_name)}</h2>
                <p className="text-sm text-muted-foreground">
                  {teacher.employee_no ? `Employee No: ${teacher.employee_no}` : 'No employee number'}
                  {teacher.phone ? ` · ${teacher.phone}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Assigned Classes</p>
            <p className="text-2xl font-bold">{uniqueClasses.size}</p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Sessions</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Upcoming</p>
            <p className="text-2xl font-bold">{upcomingSessions.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Teaching Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState title="No sessions assigned" description="Sessions will appear here once assigned." />
          ) : (
            <div className="divide-y rounded-md border">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <div className="font-medium">{s.class || 'Remedial session'}</div>
                    <div className="text-muted-foreground">
                      {dateKE(s.occurs_on)} · {s.start_time}–{s.end_time}{s.room ? ` · ${s.room}` : ''}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TeacherRoutine                                                     */
/* ------------------------------------------------------------------ */

export function TeacherRoutine() {
  const { data: ctx } = useTenant();
  const { data: teacher, isLoading: teacherLoading, isError: teacherError } = useQuery({
    queryKey: ['teacher-profile', ctx?.userId],
    enabled: !!ctx?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id,first_name,last_name')
        .eq('profile_id', ctx!.userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string } | null;
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError } = useQuery({
    queryKey: ['teacher-occurrences', teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_occurrences')
        .select('id,occurs_on,start_time,end_time,class,room,status')
        .eq('teacher_id', teacher!.id)
        .order('occurs_on', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as Occurrence[];
    },
  });

  const groupedByDate = sessions.reduce<Record<string, Occurrence[]>>((acc, s) => {
    const key = s.occurs_on;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  if (teacherLoading || sessionsLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Routine" description="Your complete daily and weekly teaching routine." />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (teacherError || sessionsError) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Routine" description="Your complete daily and weekly teaching routine." />
        <EmptyState
          title="Unable to load your routine"
          description="Assigned sessions could not be loaded. Check your connection and try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="My Routine" description="Your complete daily and weekly teaching routine." />
      {Object.keys(groupedByDate).length === 0 ? (
        <EmptyState title="No routine data" description="Your assigned sessions will appear here." />
      ) : (
        Object.entries(groupedByDate).map(([date, daySessions]) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {dateKE(date)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-md border">
                {daySessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{s.class || 'Remedial session'}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.start_time}–{s.end_time}{s.room ? ` · ${s.room}` : ''}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MarkAttendance (existing — kept for route compatibility)           */
/* ------------------------------------------------------------------ */

type PendingMark = { occurrenceId: string; status: 'attended' | 'absent'; label: string; ts: number };

const PENDING_KEY = 'eshule-pending-marks';

function loadPending(): PendingMark[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as PendingMark[];
  } catch {
    return [];
  }
}

function savePending(items: PendingMark[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
}

export function MarkAttendance() {
  const { data: ctx } = useTenant();
  const qc = useQueryClient();
  const [occurrenceId, setOccurrenceId] = useState('');
  const [pending, setPending] = useState<PendingMark[]>(() => loadPending());
  const [syncing, setSyncing] = useState(false);
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
      if (data?.status === 'already_approved') toast.info('This attendance is already approved.');
      else toast.success('Attendance recorded and sent for review.');
      qc.invalidateQueries({ queryKey: ['teacher-attendance-occurrences', teacher?.id] });
      qc.invalidateQueries({ queryKey: ['teacher-occurrences', teacher?.id] });
    },
    onError: (e) => {
      const message = (e as Error).message;
      const offline = !navigator.onLine || /network|fetch|failed to fetch|load failed/i.test(message);
      if (offline && occurrenceId) {
        const o = occurrences.find((x) => x.id === occurrenceId);
        const label = o ? `${o.occurs_on} · ${o.start_time}–${o.end_time} · ${o.class || 'Remedial'}` : occurrenceId.slice(0, 8);
        setPending((prev) => {
          const next = [...prev.filter((p) => p.occurrenceId !== occurrenceId), { occurrenceId, status: 'attended' as const, label, ts: Date.now() }];
          savePending(next);
          return next;
        });
        toast.warning('No connection — saved on this device. It will sync automatically.');
      } else {
        toast.error(`Marking failed: ${message}`);
      }
    },
  });

  async function syncPending() {
    if (!teacher?.id || !ctx?.userId || syncing) return;
    setSyncing(true);
    const remaining: PendingMark[] = [];
    for (const item of pending) {
      try {
        const { error } = await supabase.rpc('mark_own_teacher_attendance', { p_teacher_id: teacher.id, p_profile_id: ctx.userId, p_occurrence_id: item.occurrenceId, p_status: item.status });
        if (error) throw error;
      } catch {
        remaining.push(item);
      }
    }
    setPending(remaining);
    savePending(remaining);
    setSyncing(false);
    if (remaining.length === 0 && pending.length > 0) {
      toast.success('Pending marks synced.');
      qc.invalidateQueries({ queryKey: ['teacher-attendance-occurrences', teacher?.id] });
    } else if (remaining.length > 0) {
      toast.error(`${remaining.length} mark${remaining.length === 1 ? '' : 's'} still unsynced.`);
    }
  }

  useEffect(() => {
    if (pending.length > 0 && navigator.onLine && teacher?.id && ctx?.userId) void syncPending();
  }, [pending.length, teacher?.id, ctx?.userId]);

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="Teacher attendance" description="Record only Attended or Absent. Approval turns attendance into payroll evidence." />
      <Field label="Session">
        <select className="h-10 w-full rounded-md border bg-background px-3" value={occurrenceId} onChange={(e) => setOccurrenceId(e.target.value)}>
          <option value="">Select a session</option>
          {occurrences.map((o) => <option key={o.id} value={o.id}>{dateKE(o.occurs_on)} · {o.start_time}–{o.end_time} · {o.class || 'Remedial'}</option>)}
        </select>
      </Field>
      <div className="flex gap-2">
        <LoadingButton loading={mark.isPending} disabled={!occurrenceId} onClick={() => mark.mutate('attended')}>Attended</LoadingButton>
        <Button variant="outline" disabled={!occurrenceId || mark.isPending} onClick={() => mark.mutate('absent')}>Absent</Button>
      </div>
      {pending.length > 0 && (
        <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-medium">Waiting to sync ({pending.length})</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {pending.map((p) => <li key={p.occurrenceId}>· {p.label} — {p.status}</li>)}
          </ul>
          <LoadingButton loading={syncing} variant="outline" size="sm" onClick={syncPending}>Sync now</LoadingButton>
        </div>
      )}
    </div>
  );
}
