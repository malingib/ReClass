<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let parents = $derived(data.parents);
</script>

<DashboardContent title="Parents" subtitle="Parent and guardian contacts">
  <DataTable
    data={parents}
    columns={[
      { key: 'first_name', label: 'Name', render: (p: any) => `${p.first_name} ${p.last_name}`, sortable: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'students', label: 'Students', render: (p: any) => p.students ? `${p.students.first_name} ${p.students.last_name}` : '—' },
    ]}
    emptyMessage="No parents found"
  />
</DashboardContent>
