<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const timetable = $derived(data.timetable);
</script>

<DashboardContent title="Timetable" subtitle="Class schedule for your children's classes">
  <DataTable data={timetable} columns={[
    { key: 'class', label: 'Class', sortable: true },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'day', label: 'Day', sortable: true },
    { key: 'time', label: 'Time', sortable: true },
    { key: 'room', label: 'Room' },
  ]} emptyMessage="No schedule available — remedial sessions for your children's classes will appear here" />
</DashboardContent>
