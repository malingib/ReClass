<script lang="ts">
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';

  let { data } = $props();
  let stat = $derived(data.stat);
  let recentStudents = $derived(data.recentStudents);
  let recentInvoices = $derived(data.recentInvoices);
  let trend = $derived(data.trend);
  let activity = $derived(data.activity);

  const calendarDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const calendarEvents: Record<number, { label: string; type: 'Session' | 'Event'; tone: string }[]> = {
    3: [{ label: 'Mathematics · Form 2', type: 'Session', tone: 'bg-brand-50 text-brand-700' }],
    5: [{ label: 'Fee reminder', type: 'Event', tone: 'bg-warning/10 text-warning' }],
    8: [{ label: 'English · Form 1', type: 'Session', tone: 'bg-brand-50 text-brand-700' }],
    12: [{ label: 'Attendance review', type: 'Event', tone: 'bg-info/10 text-info' }],
    15: [{ label: 'Science · Form 3', type: 'Session', tone: 'bg-brand-50 text-brand-700' }],
    19: [{ label: 'Parent meeting', type: 'Event', tone: 'bg-warning/10 text-warning' }],
    22: [{ label: 'Mathematics · Form 4', type: 'Session', tone: 'bg-brand-50 text-brand-700' }],
    26: [{ label: 'Term report due', type: 'Event', tone: 'bg-danger/10 text-danger' }],
  };
  const daysInMonth = $derived(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
  const monthStartOffset = $derived((new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 6) % 7);
  const calendarCells = $derived(Array.from({ length: 42 }, (_, index) => {
    const day = index - monthStartOffset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  }));
  const today = new Date();
  const monthLabel = $derived(today.toLocaleDateString('en', { month: 'long', year: 'numeric' }));
  const isToday = (day: number) => day === today.getDate();
  const eventDate = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  const upcomingEvents = [
    { date: eventDate(1), time: '08:00 - 09:20', title: 'Mathematics remedial session', detail: 'Form 2 · Room 4', type: 'Session' },
    { date: eventDate(1), time: '14:30 - 15:30', title: 'Parent and teacher meeting', detail: 'Staff room', type: 'School event' },
    { date: eventDate(2), time: '10:00 - 11:20', title: 'English remedial session', detail: 'Form 1 · Room 2', type: 'Session' },
    { date: eventDate(4), time: '09:00 - 10:00', title: 'Attendance review', detail: 'Administration office', type: 'School event' },
  ];
</script>

{#snippet kpi(label: string, value: string | number, sub = '', trend = '', pos = false)}
  <div class="rounded-xl border border-border bg-white p-5 shadow-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-ink-400">{label}</p>
        <p class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{value}</p>
      </div>
      <span class="rounded-md px-2.5 py-1.5 text-xs font-semibold {trend ? (pos ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger') : 'bg-brand-50 text-brand-700'}">
        {trend || sub || 'Live'}
      </span>
    </div>
    {#if sub && !trend}
      <p class="mt-3 text-sm text-ink-500">{sub}</p>
    {/if}
  </div>
{/snippet}

{#snippet mini(label: string, value: string, sub = '')}
  <div class="rounded-xl border border-border/70 bg-ink-50/70 px-3 py-2.5">
    <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">{label}</p>
    <p class="mt-1 text-lg font-semibold text-ink-900">{value}</p>
    {#if sub}
      <p class="text-[11px] text-ink-400">{sub}</p>
    {/if}
  </div>
{/snippet}

<DashboardContent
  title="Remedial Operations"
  subtitle="Scheduling, teacher attendance and parent M-Pesa payments"
>
  {#snippet headerActions()}
    <span class="hidden items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-xs font-medium text-ink-600 sm:inline-flex">Last 14 days</span>
  {/snippet}
  {#snippet rightRail()}
    <RecentActivity {activity} />
  {/snippet}

  <div class="space-y-6">
    <section class="anim-card" style="animation-delay: 0.1s">
      <div class="overflow-hidden rounded-xl border border-brand-700 bg-brand-700 p-6 text-white shadow-elevated">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90">Remedial operations</p>
            <h2 class="mt-3 text-2xl font-semibold tracking-tight">Health of this week's remediation</h2>
            <p class="mt-2 max-w-xl text-sm text-white/80">Confirming teacher attendance, scheduling sessions, and reconciling M-Pesa payments from parents via paybill.</p>
          </div>
          <div class="rounded-lg border border-white/20 bg-white/10 px-4 py-3">
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/70">Today</p>
            <p class="mt-1 text-lg font-semibold">{new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-white/10 p-3">
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/70">Remedial groups</p>
            <p class="mt-1 text-xl font-semibold">{stat.groups}</p>
            <p class="mt-0.5 text-[11px] text-white/70">{stat.subjects} subjects</p>
          </div>
          <div class="rounded-lg bg-white/10 p-3">
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/70">Teacher attendance</p>
            <p class="mt-1 text-xl font-semibold">{stat.attendanceRate}%</p>
            <p class="mt-0.5 text-[11px] text-white/70">Last 14 days</p>
          </div>
          <div class="rounded-lg bg-white/10 p-3">
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/70">Outstanding</p>
            <p class="mt-1 text-xl font-semibold">KES {stat.unpaidAmount?.toLocaleString() ?? 0}</p>
            <p class="mt-0.5 text-[11px] text-white/70">{stat.unpaid} unpaid invoices</p>
          </div>
        </div>
      </div>
    </section>

    <div class="anim-card grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" style="animation-delay: 0.15s">
      {@render kpi('Remedial groups', stat.groups, 'Subject cohorts')}
      {@render kpi('Remedial teachers', stat.teachers, 'On roster')}
      {@render kpi('Enrolled students', stat.students, 'Linked parents')}
      {@render kpi('Teacher attendance', `${stat.attendanceRate}%`, 'Past 14 days', '+3.5%', true)}
      {@render kpi('Paid invoices', stat.paidInvoices ?? 0, 'M-Pesa confirmed')}
      {@render kpi('Outstanding', `KES ${stat.unpaidAmount?.toLocaleString() ?? 0}`, `${stat.unpaid} invoices`, '-1.9%', false)}
    </div>

    <div class="anim-card grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,1fr)]" style="animation-delay: 0.2s">
      <Card class="2xl:col-span-2">
        <CardHeader title="Remedial session coverage" subtitle="Teacher attendance rate over the last 14 days" />
        <CardContent>
          <div class="mb-4 grid grid-cols-4 gap-3">
            {@render mini('SESSIONS', String(stat.sessionsCount ?? 0))}
            {@render mini('TEACHERS', String(stat.teachers), 'On roster')}
            {@render mini('AVG RATE', `${stat.attendanceRate}%`)}
            {@render mini('GROUPS', String(stat.groups), 'Active cohorts')}
          </div>
          <LineChart data={trend} format={(v: number) => `${v}%`} height={180} color="#039855" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Sessions & events calendar" subtitle="Remedial sessions and school events for {monthLabel}">
          {#snippet action()}
            <button class="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">{monthLabel}</button>
          {/snippet}
        </CardHeader>
        <CardContent class="!p-0">
          <div class="grid grid-cols-7 border-t border-border">
            {#each calendarDays as weekday}
              <div class="border-b border-r border-border bg-ink-50 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500 last:border-r-0">{weekday}</div>
            {/each}
            {#each calendarCells as day, index}
              <div class="min-h-28 border-b border-r border-border p-2 {index % 7 === 6 ? 'border-r-0' : ''} {day ? 'bg-white' : 'bg-ink-50/60'}">
                {#if day}
                  <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium {isToday(day) ? 'bg-brand-600 text-white' : 'text-ink-600'}">{day}</span>
                  {#each calendarEvents[day] ?? [] as event}
                    <span class="mt-1 block truncate rounded px-1.5 py-1 text-[10px] font-medium {event.tone}" title={`${event.type}: ${event.label}`}>
                      {event.label}
                    </span>
                  {/each}
                {/if}
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Upcoming events" subtitle="Next sessions and school events">
          {#snippet action()}
            <a href="/admin/scheduling" class="text-xs font-semibold text-brand-700 hover:text-brand-800">View calendar</a>
          {/snippet}
        </CardHeader>
        <CardContent class="!pt-1">
          <div class="space-y-1">
            {#each upcomingEvents as event}
              <div class="flex gap-3 border-b border-border py-3 last:border-b-0">
                <div class="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-ink-50 px-1 py-2 text-center">
                  <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{event.date.toLocaleDateString('en', { month: 'short' })}</span>
                  <span class="mt-0.5 text-lg font-semibold leading-none text-ink-900">{event.date.getDate()}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="truncate text-sm font-semibold text-ink-800">{event.title}</p>
                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold {event.type === 'Session' ? 'bg-brand-50 text-brand-700' : 'bg-warning/10 text-warning'}">{event.type}</span>
                  </div>
                  <p class="mt-1 text-xs text-ink-500">{event.detail}</p>
                  <p class="mt-1 text-xs font-medium text-ink-600">{event.time}</p>
                </div>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="anim-card grid grid-cols-1 gap-6 lg:grid-cols-2" style="animation-delay: 0.25s">
      <Card>
        <CardHeader title="Recent student admissions">
          {#snippet action()}
            <a href="/admin/students" class="text-sm font-medium text-brand-700 hover:text-brand-800">Manage students</a>
          {/snippet}
        </CardHeader>
        <CardContent class="!p-0">
          <DataTable
            data={recentStudents}
            columns={[
              { key: 'admission_no', label: 'Adm No', sortable: true },
              { key: 'first_name', label: 'Name', render: (s: any) => `${s.first_name} ${s.last_name}` },
              { key: 'grade', label: 'Grade', sortable: true },
            ]}
            emptyMessage="No students linked yet"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Recent parent M-Pesa payments">
          {#snippet action()}
            <a href="/bursar/reconciliation" class="text-sm font-medium text-brand-700 hover:text-brand-800">Reconcile now</a>
          {/snippet}
        </CardHeader>
        <CardContent class="!p-0">
          <DataTable
            data={recentInvoices}
            columns={[
              { key: 'parent_name', label: 'Parent', render: (i: any) => i.parent ?? (i.students ? `${i.students.first_name} ${i.students.last_name}` : '—') },
              { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid ?? 0).toLocaleString()}` },
              { key: 'status', label: 'Status', render: (i: any) => i.status },
            ]}
            emptyMessage="No M-Pesa payments yet"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</DashboardContent>
