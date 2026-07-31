<script lang="ts">
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
  import { suiteModules, moduleIcons } from '$lib/modules';

  const { data } = $props();
  const stat = $derived(data.stat);
  const trend = $derived(data.trend);
  const trendIsAllZero = $derived(trend.length > 0 && trend.every((d: { value: number }) => d.value === 0));
  const activity = $derived(data.activity);

  let LineChart = $state<any>(null);
  $effect(() => {
    import('$lib/components/charts/LineChart.svelte').then(m => { LineChart = m.default; });
  });

  const accentGradients: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    orange: 'from-orange-500 to-orange-600',
    slate: 'from-slate-500 to-slate-600',
  };
  const availableModules = suiteModules.filter(m => m.status === 'available');
</script>

{#snippet kpi(label: string, value: string | number, sub = '')}
  <div class="rounded-xl border border-border bg-white p-5 shadow-card">
    <p class="text-sm font-medium text-ink-400">{label}</p>
    <p class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{value}</p>
    {#if sub}
      <p class="mt-2 text-sm text-ink-500">{sub}</p>
    {/if}
  </div>
{/snippet}

{#snippet allModulesAction()}
  <a href="/admin/modules" class="text-sm font-medium text-brand-600 hover:text-brand-700">All modules &rarr;</a>
{/snippet}

<DashboardContent title="School Dashboard" subtitle="Overview across all modules">
  <div class="space-y-6">
    <!-- School-wide KPIs -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {@render kpi('Students', stat.students, 'Enrolled')}
      {@render kpi('Teachers', stat.teachers, 'On roster')}
      {@render kpi('Attendance', `${stat.attendanceRate}%`, 'Last 14 days')}
      {@render kpi('School Fees', `KES ${(stat.schoolCollected ?? 0).toLocaleString()}`, 'Collected (12mo)')}
      {@render kpi('M-Pesa', `KES ${(stat.remedialCollected ?? 0).toLocaleString()}`, 'Remedial (12mo)')}
    </div>

    <!-- Modules quick access -->
    <Card>
      <CardHeader title="Modules" subtitle="Jump into a module workspace" action={allModulesAction}></CardHeader>
      <CardContent>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each availableModules as m (m.id)}
            <a href={m.href!}
              class="group flex items-center gap-3 rounded-xl border border-border/60 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br {accentGradients[m.accent]} text-white shadow-sm">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d={moduleIcons[m.icon]} />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-ink-900">{m.name}</p>
                <p class="truncate text-xs text-ink-400">{m.description}</p>
              </div>
            </a>
          {/each}
        </div>
      </CardContent>
    </Card>

    <!-- Activity + trend -->
    <div class="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader title="Session activity" subtitle="Sessions scheduled per day, last 14 days"></CardHeader>
        <CardContent>
          {#if trend.length > 0 && !trendIsAllZero}
            {#if LineChart}
              <LineChart data={trend} unit="sessions" />
            {:else}
              <div class="h-[220px] w-full animate-pulse rounded-xl bg-ink-100"></div>
            {/if}
          {:else}
            <div class="flex flex-col items-center justify-center py-12 text-ink-300">
              <p class="text-sm font-medium text-ink-400">No session data yet</p>
              <p class="text-xs text-ink-300">Daily session counts appear once sessions are scheduled.</p>
            </div>
          {/if}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Recent activity" subtitle="Attendance and payments"></CardHeader>
        <CardContent>
          <RecentActivity {activity} />
        </CardContent>
      </Card>
    </div>
  </div>
</DashboardContent>
