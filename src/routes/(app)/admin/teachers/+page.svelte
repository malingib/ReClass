<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let teachers = $derived(data.teachers);
</script>

<DashboardContent title="Teachers" subtitle="All teaching staff">
  <DataTable
    data={teachers}
    columns={[
      { key: 'first_name', label: 'Name', render: (t: any) => `${t.first_name} ${t.last_name}`, sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'subjects', label: 'Subjects' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No teachers found"
  />
</DashboardContent>
