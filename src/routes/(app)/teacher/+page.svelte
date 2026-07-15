<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  let { data } = $props();
  let stats = $derived(data.stats);
</script>

<DashboardContent title="Remedial teacher workflow" subtitle="Sessions today and your attendance marks">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <KpiCard label="Students" value={stats.students} sub="On your roster" />
    <KpiCard label="Sessions" value={stats.sessions} sub="This week" />
    <KpiCard label="My attendance" value={`${stats.attendanceRate}%`} sub="Confirmed sessions" />
  </div>
</DashboardContent>
