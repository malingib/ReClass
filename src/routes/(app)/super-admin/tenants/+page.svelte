<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let tenants = $derived(data.tenants);
</script>

<DashboardContent title="Tenants" subtitle="Schools on the platform">
  <DataTable data={tenants} columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'domain', label: 'Domain' },
    { key: 'status', label: 'Status', sortable: true },
  ]} emptyMessage="No tenants found" />
</DashboardContent>
