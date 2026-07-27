<script lang="ts">
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';

  const { data } = $props();
  const stat = $derived(data.stat);
  const recentStudents = $derived(data.recentStudents);
  const recentInvoices = $derived(data.recentInvoices);
  const trend = $derived(data.trend);
  const trendIsAllZero = $derived(trend.length > 0 && trend.every(d => d.value === 0));
  const activity = $derived(data.activity);

  let LineChart = $state<any>(null);
  $effect(() => {
    import('$lib/components/charts/LineChart.svelte').then(m => { LineChart = m.default; });
  });
</script>

{#snippet manageStudentsAction()}
  <a href="/admin/students" class="text-sm font-medium text-brand-600 hover:text-brand-700">Manage students &rarr;</a>
{/snippet}
{#snippet reconcileAction()}
  <a href="/admin/parent-payments" class="text-sm font-medium text-brand-600 hover:text-brand-700">View payments &rarr;</a>
{/snippet}
{#snippet openCalendarAction()}
  <a href="/admin/scheduling" class="text-sm font-medium text-brand-600 hover:text-brand-700">Open calendar &rarr;</a>
{/snippet}

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

<DashboardContent title="Remedial Operations" subtitle="Scheduling, teacher attendance and parent M-Pesa payments">
  <div class="space-y-6">
    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {@render kpi('Today', stat.sessionsCount ? 'Active' : 'Jul 16', `${stat.sessionsCount} session${stat.sessionsCount !== 1 ? 's' : ''} today`)}
      {@render kpi('Remedial sessions', stat.sessions, `${stat.subjects} subjects`)}
      {@render kpi('Teacher attendance', `${stat.attendanceRate}%`, 'Last 14 days')}
      {@render kpi('Outstanding', `KES ${(stat.unpaidAmount ?? 0).toLocaleString()}`, `${stat.unpaid} unpaid invoices`)}
    </div>

    <!-- Mini stats + chart row -->
    <div class="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            {@render mini('Remedial sessions', `${stat.sessions}`, 'Subject cohorts')}
            {@render mini('Remedial teachers', `${stat.teachers}`, 'On roster')}
            {@render mini('Enrolled students', `${stat.students}`, 'Linked parents')}
            {@render mini('Teacher attendance', `${stat.attendanceRate}%`, '+3.5%')}
            {@render mini('Paid invoices', `${stat.paidInvoices}`, 'M-Pesa confirmed')}
            {@render mini('Outstanding', `KES ${(stat.unpaidAmount ?? 0).toLocaleString()}`, '-1.9%')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Remedial session coverage" subtitle="Sessions scheduled per day over the last 14 days">
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-4 gap-2 pb-4">
            {#each [{ l: 'Sessions', v: `${stat.sessionsCount}` }, { l: 'Teachers', v: `${stat.teachers}`, sub: 'On roster' }, { l: 'Avg rate', v: `${stat.attendanceRate}%` }, { l: 'Groups', v: `${stat.sessions}`, sub: 'Active cohorts' }] as m}
              <div class="rounded-lg border border-border/60 bg-ink-50/50 px-3 py-2 text-center">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{m.l}</p>
                <p class="text-xl font-bold text-ink-900">{m.v}</p>
                {#if m.sub}
                  <p class="text-[10px] text-ink-400">{m.sub}</p>
                {/if}
              </div>
            {/each}
          </div>
          {#if trend.length > 0 && !trendIsAllZero}
            {#if LineChart}
              <LineChart data={trend} unit="sessions" />
            {:else}
              <div class="h-[220px] w-full animate-pulse rounded-xl bg-ink-100"></div>
            {/if}
          {:else}
            <div class="flex flex-col items-center justify-center py-12 text-ink-300">
              <svg class="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
              </svg>
              <p class="text-sm font-medium text-ink-400">No session data yet</p>
              <p class="text-xs text-ink-300">Daily session counts will appear here once sessions are scheduled.</p>
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- Scheduling -->
    <Card>
      <CardHeader title="Scheduling" subtitle={stat.sessionsCount > 0 ? `${stat.sessionsCount} upcoming sessions` : 'No sessions scheduled yet'} action={openCalendarAction}>
      </CardHeader>
      <CardContent>
        {#if stat.sessionsCount > 0}
          <div class="grid grid-cols-3 gap-3">
            {#each [{ l: 'Groups', v: stat.sessions }, { l: 'Sessions', v: stat.sessionsCount }, { l: 'Teachers', v: stat.teachers }] as m}
              <div class="rounded-lg border border-border/60 bg-ink-50/50 px-3 py-2 text-center">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{m.l}</p>
                <p class="text-lg font-bold text-ink-900">{m.v}</p>
              </div>
            {/each}
          </div>
          <p class="mt-3 text-sm text-ink-400">Sessions, rooms, and substitutes for the current month. View the full schedule in the calendar view.</p>
        {:else}
          <p class="text-sm text-ink-400">No sessions scheduled yet. Use the <strong>Scheduling</strong> page to set times for your remedial groups.</p>
        {/if}
      </CardContent>
    </Card>

    <!-- Recent tables -->
    <div class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Recent student admissions" action={manageStudentsAction}>
        </CardHeader>
        <CardContent class="p-0">
          <DataTable
            data={recentStudents}
            columns={[
              { key: 'admission_no', label: 'Adm No', sortable: true },
              { key: 'first_name', label: 'Name', render: (r: any) => `${r.first_name} ${r.last_name}` },
              { key: 'grade', label: 'Grade', sortable: true },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Recent parent M-Pesa payments" action={reconcileAction}>
        </CardHeader>
        <CardContent class="p-0">
          <DataTable
            data={recentInvoices}
            columns={[
              { key: 'parent', label: 'Parent', sortable: true },
              { key: 'amount_paid', label: 'Paid', render: (r: any) => `KES ${Number(r.amount_paid ?? 0).toLocaleString()}` },
              { key: 'status', label: 'Status', render: (r: any) => r.status },
            ]}
          />
        </CardContent>
      </Card>
    </div>

    <!-- Recent activity -->
    <RecentActivity activity={activity} />
  </div>
</DashboardContent>
