<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
</script>

<DashboardContent title="Remedial teacher workflow" subtitle="Sessions today and your marks">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <KpiCard label="Students" value={stats.students} sub="On your roster" />
    <KpiCard label="Sessions" value={stats.sessions} sub="This week" />
  </div>
</DashboardContent>
