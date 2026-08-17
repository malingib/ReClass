<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';

  const { data } = $props();
  const trend = $derived(data.trend ?? []);
  const summary = $derived(data.summary ?? []);

  let LineChart = $state<any>(null);
  $effect(() => {
    import('$lib/components/charts/LineChart.svelte').then(m => { LineChart = m.default; });
  });
</script>

<DashboardContent title="Program Effectiveness" subtitle="Teacher attendance rate trends and remediation impact">
  {#snippet headerActions()}
    <select class="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
      <option>This week</option>
      <option>This month</option>
      <option>This term</option>
    </select>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each summary as stat}
      <Card>
        <CardContent class="pt-6">
          <p class="text-sm font-medium text-muted-foreground">{stat.label}</p>
          <p class="mt-2 text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
          <p class="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
        </CardContent>
      </Card>
    {/each}
  </div>

  <Card>
    <CardContent class="pt-6">
      <h3 class="text-sm font-semibold text-foreground">Attendance Rate Trend</h3>
      <p class="mt-1 text-xs text-muted-foreground">Daily teacher attendance rate over the selected period</p>
      <div class="mt-4">
        <LineChart data={trend} format={(v: number) => `${v}%`} height={220} />
      </div>
    </CardContent>
  </Card>
</DashboardContent>
