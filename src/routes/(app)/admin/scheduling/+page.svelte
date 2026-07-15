<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let schedules = $derived(data.schedules);
</script>

<DashboardContent title="Remedial scheduling" subtitle="Sessions, rooms, and substitutes per cohort">
  <DataTable
    data={schedules}
    columns={[
      { key: 'title', label: 'Session', sortable: true },
      { key: 'subject', label: 'Subject' },
      { key: 'grade', label: 'Cohort' },
      { key: 'day_of_week', label: 'Day', sortable: true },
      { key: 'start_time', label: 'Start' },
      { key: 'end_time', label: 'End' },
    ]}
    emptyMessage="No remedial sessions scheduled"
  />
</DashboardContent>
