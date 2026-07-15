<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let groups = $derived(data.groups);
</script>

<DashboardContent title="Remedial Groups" subtitle="All remedial student groups">
  <DataTable
    data={groups}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'subject', label: 'Subject', sortable: true },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'student_count', label: 'Students' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No groups found"
  />
</DashboardContent>
