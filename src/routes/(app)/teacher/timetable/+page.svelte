<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let timetable = $derived(data.timetable);
</script>

<DashboardContent title="Timetable" subtitle="Your teaching schedule">
  <DataTable
    data={timetable}
    columns={[
      { key: 'title', label: 'Session', sortable: true },
      { key: 'subject', label: 'Subject' },
      { key: 'grade', label: 'Grade' },
      { key: 'day_of_week', label: 'Day', sortable: true },
      { key: 'start_time', label: 'Start' },
      { key: 'end_time', label: 'End' },
    ]}
    emptyMessage="No sessions scheduled"
  />
</DashboardContent>
