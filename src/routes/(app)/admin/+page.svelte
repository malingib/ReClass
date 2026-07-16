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
  let trendIsAllZero = $derived(trend.length > 0 && trend.every(d => d.value === 0));
  let activity = $derived(data.activity);
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
          {#if trendIsAllZero}
            <div class="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-ink-50">
                <svg class="h-5 w-5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
              <p class="text-sm font-medium text-ink-500">No session data yet</p>
              <p class="text-xs text-ink-400">Attendance trends will appear here once sessions are scheduled and marked.</p>
            </div>
          {:else}
            <LineChart data={trend} format={(v: number) => `${v}%`} height={180} color="#039855" />
          {/if}
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Scheduling" subtitle="View the full remedial calendar">
          {#snippet action()}
            <a href="/admin/scheduling" class="text-xs font-semibold text-brand-700 hover:text-brand-800">Open calendar</a>
          {/snippet}
        </CardHeader>
        <CardContent>
          <p class="text-sm text-ink-500">Sessions, rooms, and substitutes for the current month. View the full schedule in the calendar view.</p>
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
