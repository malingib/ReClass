<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
</script>

<DashboardContent title="Principal oversight" subtitle="Remedial coverage, teacher attendance and revenue">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Remedial teachers" value={stats.teachers} sub="On roster" />
    <KpiCard label="Remedial sessions" value={stats.sessions} sub="Active cohorts" />
    <KpiCard label="Teacher attendance" value={`${stats.attendanceRate}%`} sub="Past 14 days" />
    <KpiCard label="Enrolled students" value={stats.students} sub="Linked parents" />
  </div>
</DashboardContent>
