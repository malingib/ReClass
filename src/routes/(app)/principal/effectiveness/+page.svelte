<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';

  // Placeholder data — wire to actual DB queries when server endpoint is ready
  let trend = [
    { label: 'Mon', value: 88 },
    { label: 'Tue', value: 92 },
    { label: 'Wed', value: 85 },
    { label: 'Thu', value: 90 },
    { label: 'Fri', value: 87 },
    { label: 'Sat', value: 78 },
    { label: 'Sun', value: 95 },
  ];

  let summary = [
    { label: 'Overall Rate', value: '87%', sub: 'Across all sessions' },
    { label: 'Morning Sessions', value: '91%', sub: 'Avg attendance' },
    { label: 'Evening Sessions', value: '82%', sub: 'Avg attendance' },
    { label: 'Total Sessions', value: '142', sub: 'This term' },
  ];
</script>

<DashboardContent title="Program Effectiveness" subtitle="Teacher attendance rate trends and remediation impact">
  {#snippet headerActions()}
    <select class="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-600">
      <option>This week</option>
      <option>This month</option>
      <option>This term</option>
    </select>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each summary as stat}
      <div class="rounded-xl border border-border bg-white p-5 shadow-card">
        <p class="text-sm font-medium text-ink-400">{stat.label}</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{stat.value}</p>
        <p class="mt-1 text-xs text-ink-500">{stat.sub}</p>
      </div>
    {/each}
  </div>

  <div class="rounded-xl border border-border bg-white p-6 shadow-card">
    <h3 class="text-sm font-semibold text-ink-900">Attendance Rate Trend</h3>
    <p class="mt-1 text-xs text-ink-500">Daily teacher attendance rate over the selected period</p>
    <div class="mt-4">
      <LineChart data={trend} format={(v: number) => `${v}%`} height={220} color="#039855" />
    </div>
  </div>
</DashboardContent>
