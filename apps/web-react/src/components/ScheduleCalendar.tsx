import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Field, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Users } from 'lucide-react';

export type SlotOccurrence = {
  id: string;
  occurs_on: string;
  start_time: string;
  end_time: string;
  class: string | null;
  room: string | null;
  status: string;
  teacher_id: string | null;
};

export type SlotEvent = {
  id: string;
  title: string;
  event_type: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EVENT_TYPES = ['school', 'exam', 'meeting', 'holiday', 'activity', 'deadline', 'other'];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function useMonthData(year: number, month: number) {
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const from = toISODate(cells[0]);
  const to = toISODate(cells[41]);
  const occurrences = useQuery({
    queryKey: ['schedule-occurrences', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_occurrences')
        .select('id,occurs_on,start_time,end_time,class,room,status,teacher_id')
        .gte('occurs_on', from)
        .lte('occurs_on', to)
        .neq('status', 'cancelled')
        .order('occurs_on')
        .order('start_time')
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as SlotOccurrence[];
    },
  });
  const events = useQuery({
    queryKey: ['schedule-events', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_calendar_events')
        .select('id,title,event_type,starts_at,ends_at,location')
        .gte('starts_at', `${from}T00:00:00`)
        .lt('starts_at', `${to}T23:59:59`)
        .order('starts_at')
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SlotEvent[];
    },
  });
  const teachers = useQuery({
    queryKey: ['schedule-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('id,first_name,last_name').is('deleted_at', null).limit(500);
      if (error) throw error;
      return (data ?? []) as { id: string; first_name: string | null; last_name: string | null }[];
    },
  });
  return { cells, occurrences, events, teachers };
}

function teacherName(teachers: { id: string; first_name: string | null; last_name: string | null }[] | undefined, id: string | null) {
  if (!id) return null;
  const t = teachers?.find((x) => x.id === id);
  if (!t) return null;
  return `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || null;
}

function DaySlots({ dateLabel, occurrences, events, teacherOf }: {
  dateLabel: string;
  occurrences: SlotOccurrence[];
  events: SlotEvent[];
  teacherOf: (id: string | null) => string | null;
}) {
  if (occurrences.length === 0 && events.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No slots scheduled for {dateLabel}.</p>;
  }
  return (
    <ul className="space-y-2">
      {occurrences.map((o) => (
        <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{o.class || 'Remedial session'}</p>
            <p className="text-xs text-muted-foreground">
              {o.start_time?.slice(0, 5)}–{o.end_time?.slice(0, 5)}
              {teacherOf(o.teacher_id) ? ` · ${teacherOf(o.teacher_id)}` : ''}
              {o.room ? ` · ${o.room}` : ''}
            </p>
          </div>
          <span className="shrink-0 text-xs capitalize text-muted-foreground">{o.status}</span>
        </li>
      ))}
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning/5 p-2.5 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{e.title}</p>
            <p className="text-xs text-muted-foreground">
              {e.event_type ?? 'event'}
              {e.location ? ` · ${e.location}` : ''}
            </p>
          </div>
          {e.location && <MapPin className="size-3.5 shrink-0 text-muted-foreground" />}
        </li>
      ))}
    </ul>
  );
}

const SCHOOL_TIMETABLE = [
  { day: 'Mon', subject: 'Mathematics', teacher: 'Ms. Njeri', room: 'Room 1', time: '08:00 - 09:00' },
  { day: 'Mon', subject: 'English', teacher: 'Mr. Achieng', room: 'Room 4', time: '09:15 - 10:15' },
  { day: 'Tue', subject: 'Biology', teacher: 'Dr. Hassan', room: 'Lab 2', time: '08:30 - 09:30' },
  { day: 'Wed', subject: 'Physics', teacher: 'Mr. Koech', room: 'Lab 1', time: '10:00 - 11:00' },
  { day: 'Thu', subject: 'Chemistry', teacher: 'Mrs. Wanjiru', room: 'Lab 3', time: '11:15 - 12:15' },
  { day: 'Fri', subject: 'Business Studies', teacher: 'Mrs. Owino', room: 'Room 5', time: '08:00 - 09:00' },
];

const REMEDIAL_TIMETABLE = [
  { day: 'Mon', subject: 'Math Revision', teacher: 'Ms. Njeri', room: 'Remedial Lab', time: '16:00 - 17:00' },
  { day: 'Tue', subject: 'Science Clinic', teacher: 'Dr. Hassan', room: 'Lab 2', time: '17:00 - 18:00' },
  { day: 'Wed', subject: 'English Boost', teacher: 'Mr. Achieng', room: 'Room 7', time: '15:30 - 16:30' },
  { day: 'Thu', subject: 'Exam Prep', teacher: 'Mrs. Wanjiru', room: 'Room 3', time: '16:15 - 17:15' },
  { day: 'Fri', subject: 'Leadership Coaching', teacher: 'Mrs. Owino', room: 'Conference Room', time: '15:00 - 16:00' },
];

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function plannerFor(mode: 'school' | 'remedial') {
  return mode === 'school' ? SCHOOL_TIMETABLE : REMEDIAL_TIMETABLE;
}

/**
 * A cleaner planner layout inspired by calendly-style booking interfaces:
 * a weekly date grid, a selected-day summary, and clear teacher allocation cards.
 */
export function ScheduleCalendar({ compact = false, variant = 'school' }: { compact?: boolean; variant?: 'school' | 'remedial' }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(toISODate(now));
  const [view, setView] = useState<'school' | 'remedial'>(variant);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', event_type: 'school', date: toISODate(now), start: '08:00', end: '', location: '' });
  const [saving, setSaving] = useState(false);

  const { cells, occurrences, events, teachers } = useMonthData(year, month);
  const occRows = occurrences.data ?? [];
  const evtRows = events.data ?? [];
  const selectedOcc = occRows.filter((o) => o.occurs_on === selected);
  const selectedEvt = evtRows.filter((e) => String(e.starts_at).slice(0, 10) === selected);
  const teacherOf = (id: string | null) => teacherName(teachers.data, id);
  const isLoading = occurrences.isLoading || events.isLoading;
  const title = new Date(year, month, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

  const byDay = useMemo(() => {
    const m = new Map<string, { sessions: number; events: number }>();
    for (const o of occRows) {
      const entry = m.get(o.occurs_on) ?? { sessions: 0, events: 0 };
      entry.sessions += 1;
      m.set(o.occurs_on, entry);
    }
    for (const e of evtRows) {
      const key = String(e.starts_at).slice(0, 10);
      const entry = m.get(key) ?? { sessions: 0, events: 0 };
      entry.events += 1;
      m.set(key, entry);
    }
    return m;
  }, [occRows, evtRows]);

  const currentWeekSlots = useMemo(() => plannerFor(view), [view]);
  const selectedDayLabel = new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  const selectedSlots = currentWeekSlots.filter((slot) => slot.day === selectedDayLabel);

  function shift(dir: number) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Event title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        event_type: form.event_type,
        starts_at: `${form.date}T${form.start || '08:00'}:00`,
        ends_at: form.end ? `${form.date}T${form.end}:00` : null,
        location: form.location.trim() || null,
      };
      const { error } = await supabase.from('school_calendar_events').insert(payload);
      if (error) throw error;
      toast.success('School event added.');
      setShowForm(false);
      setForm({ title: '', event_type: 'school', date: form.date, start: '08:00', end: '', location: '' });
      void occurrences.refetch();
      void events.refetch();
    } catch (err) {
      toast.error(`Could not save the event: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const handleSelectWeekday = (day: string) => {
    const firstOfMonth = new Date(year, month, 1);
    const mondayShift = (firstOfMonth.getDay() + 6) % 7;
    const offset = (DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number]) - mondayShift + 7) % 7;
    const target = new Date(firstOfMonth);
    target.setDate(firstOfMonth.getDate() + offset);
    setSelected(toISODate(target));
  };

  const dayRail = DAY_KEYS.map((day) => ({
    day,
    slots: currentWeekSlots.filter((slot) => slot.day === day),
    selected: selectedDayLabel === day,
  }));

  const bookingCards = selectedSlots.length === 0 ? null : selectedSlots.map((slot) => ({
    ...slot,
    badge: view === 'school' ? 'Class' : 'Session',
    tagColor: view === 'school' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  }));

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
          <p className="text-sm font-semibold">{title}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(toISODate(now)); }} aria-label="Go to today"><CalendarDays className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[120px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border bg-muted/20 p-2">
            {dayRail.map(({ day, slots, selected }) => (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectWeekday(day)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-2 py-2 text-left transition-colors',
                  selected ? 'border-primary bg-background text-primary shadow-sm' : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-background/70',
                )}
              >
                <span className="text-sm font-medium">{day}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">{slots.length}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border bg-card p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Week view</p>
                <p className="mt-1 text-base font-semibold">{selectedDayLabel}</p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-primary">{view}</span>
            </div>
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots scheduled.</p>
            ) : selectedSlots.map((slot) => (
              <div key={`${slot.day}-${slot.subject}-${slot.time}`} className="mb-2 rounded-xl border bg-muted/20 p-3 last:mb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{slot.subject}</p>
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide', slot.teacher ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300')}>{view === 'school' ? 'Class' : 'Session'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border bg-background px-2 py-1">{slot.teacher}</span>
                  <span className="rounded-full border bg-background px-2 py-1">{slot.time}</span>
                  <span className="rounded-full border bg-background px-2 py-1">{slot.room}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><CalendarDays className="size-4" /></div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Scheduling</p>
            <p className="text-lg font-semibold">{view === 'school' ? 'Academic timetable' : 'Remedial schedule'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border bg-muted/40 p-1">
            {(['school', 'remedial'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  view === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => { setForm((f) => ({ ...f, date: selected })); setShowForm((v) => !v); }}>
            <Plus className="size-4" />New event
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Title" htmlFor="ev-title"><Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Parents meeting" required /></Field>
              <Field label="Type" htmlFor="ev-type">
                <select id="ev-type" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Date" htmlFor="ev-date"><Input id="ev-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
              <Field label="Start" htmlFor="ev-start"><Input id="ev-start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
              <Field label="End (optional)" htmlFor="ev-end"><Input id="ev-end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
              <Field label="Location (optional)" htmlFor="ev-loc"><Input id="ev-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main hall" /></Field>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Event'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Month</p>
              <p className="text-sm font-semibold">{title}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 p-1">
              {DAY_KEYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectWeekday(day)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    selectedDayLabel === day ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(toISODate(now)); }}>Today</Button>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[170px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 xl:border-b-0 xl:border-r">
            <div className="p-2">
              <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Days</p>
              <div className="space-y-2">
                {dayRail.map(({ day, slots, selected }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectWeekday(day)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all',
                      selected ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-background/70',
                    )}
                  >
                    <div>
                      <p className="text-xs font-medium">{day}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{slots.length} slots</p>
                    </div>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', selected ? 'bg-primary/10' : 'bg-muted')}>
                      {slots.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected day</p>
                <p className="mt-1 text-lg font-semibold">{selectedDayLabel}</p>
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]', view === 'school' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300')}>
                {view === 'school' ? 'Academic' : 'Remedial'}
              </span>
            </div>

            <div className="space-y-3">
              {selectedSlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No scheduled activities for this day.</div>
              ) : bookingCards?.map((slot) => (
                <div key={`${slot.day}-${slot.subject}-${slot.time}`} className="rounded-2xl border bg-background p-4 shadow-sm ring-1 ring-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold">{slot.subject}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{slot.day} · {slot.time}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em]', slot.tagColor)}>{slot.badge}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-foreground">{slot.teacher}</span>
                    <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-foreground">{slot.room}</span>
                    <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-foreground">{slot.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
