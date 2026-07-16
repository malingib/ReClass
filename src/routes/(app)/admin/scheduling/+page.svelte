<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  let { data } = $props();

  interface Session {
    id: string;
    title: string;
    subject: string;
    grade: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    status: string | null;
  }

  let sessions: Session[] = $derived(data.schedules ?? []);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // JS day mapping: 0=Sun..6=Sat; our DB uses 1=Mon..7=Sun
  const dbDayToIndex = (d: number) => d - 1;

  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());

  let daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
  let monthStartOffset = $derived((new Date(currentYear, currentMonth, 1).getDay() + 6) % 7); // Mon=0

  let monthLabel = $derived(
    new Date(currentYear, currentMonth).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  );

  let calendarCells = $derived(
    Array.from({ length: 42 }, (_, index) => {
      const day = index - monthStartOffset + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    })
  );

  // Group sessions by day of week (1=Mon..7=Sun)
  let sessionsByDay = $state<Record<number, Session[]>>({});

  $effect(() => {
    const map: Record<number, Session[]> = {};
    for (const s of sessions) {
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push(s);
    }
    sessionsByDay = map;
  });

  function prevMonth() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; }
    else { currentMonth--; }
  }

  function nextMonth() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; }
    else { currentMonth++; }
  }

  function getSessionsForDay(day: number): Session[] {
    // Determine day of week (1=Mon..7=Sun) for this day in the current month
    const date = new Date(currentYear, currentMonth, day);
    const dbDay = ((date.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
    return sessionsByDay[dbDay] ?? [];
  }

  function timeDisplay(t: string): string {
    if (!t) return '—';
    // t is HH:MM:SS or HH:MM format
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
</script>

<DashboardContent title="Remedial scheduling" subtitle="Sessions, rooms, and substitutes per cohort — calendar view">
  {#snippet headerActions()}
    <div class="flex items-center gap-2">
      <button
        onclick={prevMonth}
        class="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
      >
        ← Prev
      </button>
      <span class="text-sm font-semibold text-ink-900">{monthLabel}</span>
      <button
        onclick={nextMonth}
        class="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
      >
        Next →
      </button>
    </div>
  {/snippet}

  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-card">
    <!-- Day headers -->
    <div class="grid grid-cols-7 border-b border-border bg-ink-50/70">
      {#each dayLabels as label}
        <div class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
          {label}
        </div>
      {/each}
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7">
      {#each calendarCells as day, index}
        {@const daySessions = day ? getSessionsForDay(day) : []}
        {@const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()}
        <div
          class="min-h-28 border-b border-r border-border p-2 {index % 7 === 6 ? 'border-r-0' : ''} {day ? 'bg-white' : 'bg-ink-50/60'}"
        >
          {#if day}
            <span class="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium {isToday ? 'bg-brand-600 text-white' : 'text-ink-600'}">
              {day}
            </span>
            <div class="space-y-1">
              {#each daySessions.slice(0, 3) as session}
                <div class="truncate rounded bg-brand-50 px-1.5 py-1 text-[10px] font-medium text-brand-700 leading-tight" title="{session.title} · {session.grade} · {timeDisplay(session.start_time)}–{timeDisplay(session.end_time)}">
                  {session.title}{#if session.grade} · {session.grade}{/if}
                  <span class="block text-[9px] text-brand-500">{timeDisplay(session.start_time)}</span>
                </div>
              {/each}
              {#if daySessions.length > 3}
                <div class="text-center text-[9px] font-medium text-ink-400">+{daySessions.length - 3} more</div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Week view: table of weekly recurring schedule -->
  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-card">
    <div class="border-b border-border bg-ink-50/70 px-4 py-3">
      <p class="text-sm font-semibold text-ink-900">Weekly recurring schedule</p>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border/70 bg-ink-50/70">
            <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Day</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Time</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Session</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Subject</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Cohort</th>
          </tr>
        </thead>
        <tbody>
          {#each sessions as session, idx}
            <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
              <td class="px-4 py-3 font-medium text-ink-700">{dayLabels[dbDayToIndex(session.day_of_week)]}</td>
              <td class="px-4 py-3 text-ink-600">{timeDisplay(session.start_time)} – {timeDisplay(session.end_time)}</td>
              <td class="px-4 py-3 text-ink-700">{session.title}</td>
              <td class="px-4 py-3 text-ink-600">{session.subject}</td>
              <td class="px-4 py-3 text-ink-600">{session.grade}</td>
            </tr>
          {:else}
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-sm text-ink-500">No recurring sessions scheduled</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</DashboardContent>