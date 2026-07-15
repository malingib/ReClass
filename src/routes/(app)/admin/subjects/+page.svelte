<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let subjects = $derived(data.subjects);
</script>

<DashboardContent title="Subjects" subtitle="Academic subjects offered">
  <DataTable
    data={subjects}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No subjects found"
  />
</DashboardContent>
