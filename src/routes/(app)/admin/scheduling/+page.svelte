<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();

  interface Session {
    id: string; title: string; subject: string; grade: string; teacher: string;
    day_of_week: number; start_time: string; end_time: string; slot: string | null; room: string | null; active: boolean;
  }

  interface Option { id: string; name: string; }

  const subjects: Option[] = $derived((data as any).subjects ?? []);
  const teachers: Option[] = $derived((data as any).teachers ?? []);
  const sessions: Session[] = $derived((data as any).schedules ?? []);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayOptions = dayLabels.map((l, i) => ({ value: i + 1, label: l }));
  const dbDayToIndex = (d: number) => d - 1;

  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());

  const daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
  const monthStartOffset = $derived((new Date(currentYear, currentMonth, 1).getDay() + 6) % 7);
  const monthLabel = $derived(new Date(currentYear, currentMonth).toLocaleDateString('en', { month: 'long', year: 'numeric' }));

  const calendarCells = $derived(
    Array.from({ length: 42 }, (_, index) => {
      const day = index - monthStartOffset + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    })
  );

  const sessionsByDay = $derived.by(() => {
    const map: Record<number, Session[]> = {};
    for (const s of sessions) {
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push(s);
    }
    return map;
  });

  // Calendar helpers
  function getSessionsForDay(day: number): Session[] {
    const date = new Date(currentYear, currentMonth, day);
    const dbDay = ((date.getDay() + 6) % 7) + 1;
    return sessionsByDay[dbDay] ?? [];
  }

  function timeDisplay(t: string): string {
    if (!t) return '—';
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  // New session form state
  let showForm = $state(false);
  let newClass = $state('');
  let newSubject = $state('');
  let newTeacher = $state('');
  let newDay = $state('1');
  let newStart = $state('14:00');
  let newEnd = $state('15:00');
  let newRoom = $state('');
  const newSlot = $state('');
  const submitting = $state(false);
  const formError = $state('');

  function confirmDelete(e: Event) {
    if (!confirm('Archive this recurring session?')) e.preventDefault();
  }

  const dayColors: Record<number, string> = { 1: 'bg-brand-50 text-brand-700', 2: 'bg-violet-50 text-violet-700', 3: 'bg-amber-50 text-amber-700', 4: 'bg-rose-50 text-rose-700', 5: 'bg-cyan-50 text-cyan-700', 6: 'bg-emerald-50 text-emerald-700', 7: 'bg-slate-50 text-slate-700' };
</script>

<DashboardContent title="Remedial scheduling" subtitle="Set times for remedial classes — calendar view with session badges">
  {#snippet headerActions()}
    <div class="flex items-center gap-2">
      <button onclick={() => showForm = !showForm}
        class="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700">
        {showForm ? 'Cancel' : '+ Add session'}
      </button>
      <button onclick={() => { currentMonth === 0 ? (currentMonth = 11, currentYear--) : currentMonth--; }}
        class="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">← Prev</button>
      <span class="text-sm font-semibold text-ink-900">{monthLabel}</span>
      <button onclick={() => { currentMonth === 11 ? (currentMonth = 0, currentYear++) : currentMonth++; }}
        class="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">Next →</button>
    </div>
  {/snippet}

  <!-- Create form -->
  {#if showForm}
    <form method="POST" action="?/create" class="mb-6 rounded-2xl border border-border/80 bg-brand-50/50 p-5 shadow-sm">
      <input type="hidden" name="slot" value={newSlot} />
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label for="session-class" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">Class</label>
          <input id="session-class" name="class" bind:value={newClass} required placeholder="e.g. Form 2"
            class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900" />
        </div>
        <div>
          <label for="session-subject" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">Subject</label>
          <select id="session-subject" name="subject_id" bind:value={newSubject} required class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900">
            <option value="">Select subject…</option>
            {#each subjects as s}<option value={s.id}>{s.name}</option>{/each}
          </select>
        </div>
        <div>
          <label for="session-teacher" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">Teacher</label>
          <select id="session-teacher" name="teacher_id" bind:value={newTeacher} required class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900">
            <option value="">Select teacher…</option>
            {#each teachers as t (t.id)}<option value={t.id}>{(t as any).first_name} {(t as any).last_name}</option>{/each}
          </select>
        </div>
        <div>
          <label for="session-room" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">Room</label>
          <input id="session-room" name="room" bind:value={newRoom} required placeholder="e.g. Lab 2" class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900" />
        </div>
        <div>
          <label for="session-day" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">Day</label>
          <select id="session-day" name="day_of_week" bind:value={newDay} class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900">
            {#each dayOptions as o}<option value={o.value}>{o.label}</option>{/each}
          </select>
        </div>
        <div>
          <label for="session-start" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">Start</label>
          <input id="session-start" type="time" name="start_time" bind:value={newStart} class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900" />
        </div>
        <div>
          <label for="session-end" class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">End</label>
          <input id="session-end" type="time" name="end_time" bind:value={newEnd} class="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900" />
        </div>
        <button type="submit"
          class="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">Save</button>
      </div>
    </form>
  {/if}

  <!-- Calendar grid -->
  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-card">
    <div class="grid grid-cols-7 border-b border-border bg-ink-50/70">
      {#each dayLabels as label}
        <div class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</div>
      {/each}
    </div>
    <div class="grid grid-cols-7">
      {#each calendarCells as day, index}
        {@const daySessions = day ? getSessionsForDay(day) : []}
        {@const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()}
        <div class="min-h-28 border-b border-r border-border p-1.5 {index % 7 === 6 ? 'border-r-0' : ''} {day ? 'bg-white' : 'bg-ink-50/60'}">
          {#if day}
            <span class="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium {isToday ? 'bg-brand-600 text-white' : 'text-ink-600'}">{day}</span>
            {#if daySessions.length > 0}
              <div class="space-y-1">
                {#each daySessions.slice(0, 3) as session}
                  <div class="truncate rounded px-1.5 py-1 text-[10px] font-medium leading-tight {session.active ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500'}"
                    title="{session.title} · {session.subject} · {timeDisplay(session.start_time)}–{timeDisplay(session.end_time)}">
                    {session.title}
                    <span class="block text-[9px] {session.active ? 'text-brand-500' : 'text-ink-400'}">{timeDisplay(session.start_time)}</span>
                  </div>
                {/each}
                {#if daySessions.length > 3}
                  <div class="text-center text-[9px] font-medium text-ink-400">+{daySessions.length - 3} more</div>
                {/if}
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Weekly schedule table with controls -->
  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-card">
    <div class="flex items-center justify-between border-b border-border bg-ink-50/70 px-4 py-3">
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
            <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Status</th>
            <th class="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {#each sessions as session, idx}
            <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
              <td class="px-4 py-3 font-medium text-ink-700">{dayLabels[dbDayToIndex(session.day_of_week)]}</td>
              <td class="px-4 py-3 text-ink-600">{timeDisplay(session.start_time)} – {timeDisplay(session.end_time)}</td>
              <td class="px-4 py-3 text-ink-700">{session.title}</td>
              <td class="px-4 py-3 text-ink-600">{session.subject}</td>
              <td class="px-4 py-3">
                <form method="POST" action="?/toggle" class="inline">
                  <input type="hidden" name="id" value={session.id} />
                  <input type="hidden" name="active" value={session.active ? 'false' : 'true'} />
                  <button type="submit" class="rounded-full px-2 py-0.5 text-[10px] font-semibold {session.active ? 'bg-success/10 text-success' : 'bg-ink-100 text-ink-500'}">
                    {session.active ? 'Active' : 'Inactive'}
                  </button>
                </form>
              </td>
              <td class="px-4 py-3">
                <form method="POST" action="?/delete">
                  <input type="hidden" name="id" value={session.id} />
                  <button type="submit" onclick={confirmDelete} class="text-[11px] font-medium text-danger hover:text-danger/80">Delete</button>
                </form>
              </td>
            </tr>
          {:else}
            <tr><td colspan="6" class="px-4 py-8 text-center text-sm text-ink-500">No sessions scheduled. Use <strong>+ Add session</strong> above to set times for a class.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</DashboardContent>
