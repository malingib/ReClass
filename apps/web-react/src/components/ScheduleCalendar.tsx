import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Field, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';

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

/**
 * Month calendar over live data: session occurrence slots + school events.
 * Full mode adds school-event creation; compact mode is a dashboard widget.
 */
export function ScheduleCalendar({ compact = false }: { compact?: boolean }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(toISODate(now));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', event_type: 'school', date: toISODate(now), start: '08:00', end: '', location: '' });
  const [saving, setSaving] = useState(false);

  const { cells, occurrences, events, teachers } = useMonthData(year, month);
  const occRows = occurrences.data ?? [];
  const evtRows = events.data ?? [];

  const byDay = useMemo(() => {
    const m = new Map<string, { sessions: number; events: number }>();
    for (const o of occRows) {
      const e = m.get(o.occurs_on) ?? { sessions: 0, events: 0 };
      e.sessions += 1;
      m.set(o.occurs_on, e);
    }
    for (const e of evtRows) {
      const key = String(e.starts_at).slice(0, 10);
      const c = m.get(key) ?? { sessions: 0, events: 0 };
      c.events += 1;
      m.set(key, c);
    }
    return m;
  }, [occRows, evtRows]);

  const selectedOcc = occRows.filter((o) => o.occurs_on === selected);
  const selectedEvt = evtRows.filter((e) => String(e.starts_at).slice(0, 10) === selected);
  const teacherOf = (id: string | null) => teacherName(teachers.data, id);
  const isLoading = occurrences.isLoading || events.isLoading;
  const title = new Date(year, month, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

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

  const grid = (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${title} calendar`}>
        {cells.map((d) => {
          const key = toISODate(d);
          const inMonth = d.getMonth() === month;
          const counts = byDay.get(key);
          const isToday = key === toISODate(new Date());
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${key}${counts ? `, ${counts.sessions} sessions, ${counts.events} events` : ''}`}
              onClick={() => setSelected(key)}
              className={cn(
                'flex min-h-9 flex-col items-center justify-start rounded-md border p-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                compact && 'min-h-8 p-0.5',
                !inMonth && 'opacity-35',
                isSel ? 'border-primary bg-primary/10 font-bold' : 'border-transparent hover:border-border hover:bg-muted/50',
                isToday && !isSel && 'border-dashed border-primary/50',
              )}
            >
              <span className={cn(isToday && 'font-bold text-primary')}>{d.getDate()}</span>
              {counts && (
                <span className="flex gap-0.5" aria-hidden>
                  {counts.sessions > 0 && <span className="size-1.5 rounded-full bg-primary" />}
                  {counts.events > 0 && <span className="size-1.5 rounded-full bg-warning" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" aria-hidden />Sessions</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" aria-hidden />Events</span>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(toISODate(now)); }} aria-label="Go to today"><CalendarDays className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
          </div>
        </div>
        {isLoading ? <p className="py-4 text-center text-sm text-muted-foreground">Loading slots…</p> : grid}
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {selected === toISODate(new Date()) ? 'Today' : selected} · {selectedOcc.length + selectedEvt.length} slot{(selectedOcc.length + selectedEvt.length) === 1 ? '' : 's'}
          </p>
          {!isLoading && <DaySlots dateLabel={selected} occurrences={selectedOcc} events={selectedEvt} teacherOf={teacherOf} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
          <p className="min-w-36 text-center text-sm font-semibold">{title}</p>
          <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(toISODate(now)); }}>Today</Button>
        </div>
        <Button size="sm" onClick={() => { setForm((f) => ({ ...f, date: selected })); setShowForm((v) => !v); }}>
          <Plus className="size-4" />Add School Event
        </Button>
      </div>

      {showForm && (
        <Card><CardContent className="p-5">
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
        </CardContent></Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3"><CardContent className="p-4">
          {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading calendar…</p> : grid}
        </CardContent></Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Slots · {selected}</CardTitle></CardHeader>
          <CardContent>
            {occurrences.isError || events.isError ? (
              <EmptyState title="Could not load slots" description="Check your connection and try again." />
            ) : (
              <DaySlots dateLabel={selected} occurrences={selectedOcc} events={selectedEvt} teacherOf={teacherOf} />
            )}
            <p className="mt-3 text-xs text-muted-foreground">Session slots come from the remedial programme setup ({monthKey(new Date(year, month, 1))} view). Mark attendance from the Remedial Attendance page.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
